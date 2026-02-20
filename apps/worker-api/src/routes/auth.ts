import { requireDb } from "../db/client";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import type { Env } from "../types";

type StartAuthInput = {
  email?: string;
  name?: string;
};

type VerifyAuthInput = {
  email?: string;
  code?: string;
};

type AccountRow = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  status: string;
  email_verified_at: string | null;
};

type VerificationRow = {
  id: string;
  account_id: string;
  expires_at: string;
};

type SessionRow = {
  id: string;
  account_id: string;
  expires_at: string;
  last_seen_at: string | null;
  status: string;
  tenant_id: string;
  email: string;
  name: string;
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_LIMIT_PER_WINDOW = 5;

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateVerificationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const number = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return String(Math.abs(number) % 1_000_000).padStart(6, "0");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendVerificationEmail(input: {
  env: Env;
  email: string;
  code: string;
}): Promise<void> {
  if (!input.env.RESEND_API_KEY || !input.env.EMAIL_FROM) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: input.env.EMAIL_FROM,
      to: [input.email],
      subject: "Your OpenClaw login code",
      text: `Your OpenClaw verification code is ${input.code}. It expires in 10 minutes.`
    })
  });

  if (!response.ok) {
    throw new Error(`Unable to send verification email: ${response.status}`);
  }
}

async function logAuditEvent(input: {
  env: Env;
  tenantId?: string | null;
  actorType: string;
  actorId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = requireDb(input.env);
    await db
      .prepare(
        "INSERT INTO audit_events (id, tenant_id, actor_type, actor_id, action, metadata_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
      )
      .bind(
        crypto.randomUUID(),
        input.tenantId ?? null,
        input.actorType,
        input.actorId ?? null,
        input.action,
        JSON.stringify(input.metadata ?? {}),
        new Date().toISOString()
      )
      .run();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn("audit log insert failed", {
      action: input.action,
      tenantId: input.tenantId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      reason
    });
  }
}

async function resolveSession(
  request: Request,
  env: Env
): Promise<SessionRow | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }
  const tokenHash = await hashToken(token);
  const db = requireDb(env);
  const row = await db
    .prepare(
      "SELECT s.id, s.account_id, s.expires_at, s.last_seen_at, s.status, a.tenant_id, a.email, a.name FROM auth_sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?1 LIMIT 1"
    )
    .bind(tokenHash)
    .first<SessionRow | null>();
  if (!row || row.status !== "active") {
    return null;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db
      .prepare("UPDATE auth_sessions SET status = 'expired' WHERE id = ?1")
      .bind(row.id)
      .run();
    return null;
  }
  const lastSeenAtMs = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
  if (lastSeenAtMs > 0 && Date.now() - lastSeenAtMs > SESSION_IDLE_TIMEOUT_MS) {
    await db
      .prepare("UPDATE auth_sessions SET status = 'expired' WHERE id = ?1")
      .bind(row.id)
      .run();
    return null;
  }

  const now = new Date().toISOString();
  const refreshedExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db
    .prepare("UPDATE auth_sessions SET last_seen_at = ?1, expires_at = ?2 WHERE id = ?3")
    .bind(now, refreshedExpiresAt, row.id)
    .run();
  return row;
}

export async function handleAuthStart(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  try {
    const body = await parseJson<StartAuthInput>(request);
    if (!body?.email || !validEmail(body.email)) {
      return json({ error: "valid email is required" }, 400);
    }

    const db = requireDb(env);
    const email = body.email.toLowerCase();
    const tenants = createTenantRepository(db);
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

    const recentCodeCount = await db
      .prepare(
        "SELECT COUNT(*) as count FROM email_verification_codes WHERE email = ?1 AND created_at >= ?2"
      )
      .bind(email, new Date(Date.now() - OTP_WINDOW_MS).toISOString())
      .first<{ count: number } | null>();

    if ((recentCodeCount?.count ?? 0) >= OTP_LIMIT_PER_WINDOW) {
      await logAuditEvent({
        env,
        actorType: "account",
        actorId: email,
        action: "auth.otp_rate_limited",
        metadata: { email, ip }
      });
      return json({ error: "too many code requests, please wait 15 minutes" }, 429);
    }

    let account = await db
      .prepare(
        "SELECT id, tenant_id, name, email, status, email_verified_at FROM accounts WHERE email = ?1 LIMIT 1"
      )
      .bind(email)
      .first<AccountRow | null>();

    const requestedName = body.name?.trim();
    const inferredName = requestedName || email.split("@")[0] || "OpenClaw User";

    if (!account) {
      const existingTenant = await tenants.findByEmail(email);
      const tenant =
        existingTenant ??
        (await tenants.create({ name: inferredName, email }));
      const now = new Date().toISOString();
      const accountId = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO accounts (id, tenant_id, name, email, status, email_verified_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'pending_email_verification', NULL, ?5, ?6)"
        )
        .bind(accountId, tenant.id, inferredName, email, now, now)
        .run();
      account = {
        id: accountId,
        tenant_id: tenant.id,
        name: inferredName,
        email,
        status: "pending_email_verification",
        email_verified_at: null
      };
    }

    if (account && requestedName && account.name !== requestedName) {
      await db
        .prepare("UPDATE accounts SET name = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(requestedName, new Date().toISOString(), account.id)
        .run();
    }

    const code = generateVerificationCode();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db
      .prepare(
        "INSERT INTO email_verification_codes (id, account_id, email, code, status, expires_at, created_at, used_at) VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, NULL)"
      )
      .bind(crypto.randomUUID(), account.id, email, code, expiresAt, now)
      .run();

    try {
      await sendVerificationEmail({ env, email, code });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      await logAuditEvent({
        env,
        tenantId: account.tenant_id,
        actorType: "account",
        actorId: account.id,
        action: "auth.otp_send_failed",
        metadata: { email, ip, reason }
      });
      return json({ error: "unable to deliver verification code email right now" }, 502);
    }
    await logAuditEvent({
      env,
      tenantId: account.tenant_id,
      actorType: "account",
      actorId: account.id,
      action: "auth.otp_sent",
      metadata: { email, ip }
    });

    return json({
      ok: true,
      requiresVerification: true,
      devCode:
        !env.RESEND_API_KEY || !env.EMAIL_FROM
          ? code
          : undefined
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error("auth start failed", {
      reason
    });
    return json({ error: "unable to start authentication" }, 500);
  }
}

export async function handleAuthVerify(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const body = await parseJson<VerifyAuthInput>(request);
  if (!body?.email || !body.code) {
    return json({ error: "email and code are required" }, 400);
  }
  const email = body.email.toLowerCase();
  const code = body.code.trim();
  const db = requireDb(env);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const verification = await db
    .prepare(
      "SELECT id, account_id, expires_at FROM email_verification_codes WHERE email = ?1 AND code = ?2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    )
    .bind(email, code)
    .first<VerificationRow | null>();

  if (!verification) {
    await logAuditEvent({
      env,
      actorType: "account",
      actorId: email,
      action: "auth.otp_verify_failed",
      metadata: { email, ip, reason: "invalid_code" }
    });
    return json({ error: "invalid verification code" }, 400);
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    await db
      .prepare("UPDATE email_verification_codes SET status = 'expired' WHERE id = ?1")
      .bind(verification.id)
      .run();
    await logAuditEvent({
      env,
      actorType: "account",
      actorId: email,
      action: "auth.otp_verify_failed",
      metadata: { email, ip, reason: "expired_code" }
    });
    return json({ error: "verification code expired" }, 400);
  }

  await db
    .prepare("UPDATE email_verification_codes SET status = 'used', used_at = ?1 WHERE id = ?2")
    .bind(new Date().toISOString(), verification.id)
    .run();

  const account = await db
    .prepare(
      "SELECT id, tenant_id, name, email, status, email_verified_at FROM accounts WHERE id = ?1 LIMIT 1"
    )
    .bind(verification.account_id)
    .first<AccountRow | null>();

  if (!account) {
    return json({ error: "account not found" }, 404);
  }

  const now = new Date().toISOString();
  if (!account.email_verified_at) {
    await db
      .prepare(
        "UPDATE accounts SET status = 'active', email_verified_at = ?1, updated_at = ?2 WHERE id = ?3"
      )
      .bind(now, now, account.id)
      .run();
  }

  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db
    .prepare(
      "INSERT INTO auth_sessions (id, account_id, token_hash, status, expires_at, created_at, revoked_at, last_seen_at) VALUES (?1, ?2, ?3, 'active', ?4, ?5, NULL, ?6)"
    )
    .bind(crypto.randomUUID(), account.id, tokenHash, expiresAt, now, now)
    .run();
  await logAuditEvent({
    env,
    tenantId: account.tenant_id,
    actorType: "account",
    actorId: account.id,
    action: "auth.login_success",
    metadata: { email, ip }
  });

  return json({
    ok: true,
    sessionToken: token,
    user: {
      accountId: account.id,
      tenantId: account.tenant_id,
      email: account.email,
      name: account.name
    }
  });
}

export async function handleAuthMe(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }
  const session = await resolveSession(request, env);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  return json({
    authenticated: true,
    user: {
      accountId: session.account_id,
      tenantId: session.tenant_id,
      email: session.email,
      name: session.name
    }
  });
}

export async function handleAuthLogout(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: true });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return json({ ok: true });
  }
  const tokenHash = await hashToken(token);
  const db = requireDb(env);
  const session = await db
    .prepare("SELECT account_id FROM auth_sessions WHERE token_hash = ?1 LIMIT 1")
    .bind(tokenHash)
    .first<{ account_id: string } | null>();
  await db
    .prepare("UPDATE auth_sessions SET status = 'revoked', revoked_at = ?1 WHERE token_hash = ?2")
    .bind(new Date().toISOString(), tokenHash)
    .run();
  if (session?.account_id) {
    await logAuditEvent({
      env,
      actorType: "account",
      actorId: session.account_id,
      action: "auth.logout"
    });
  }
  return json({ ok: true });
}
