import { requireDb } from "../db/client";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import type { Env } from "../types";

type StartSignupInput = {
  name?: string;
  email?: string;
};

type VerifySignupInput = {
  email?: string;
  code?: string;
};

type AccountRow = {
  id: string;
  tenant_id: string;
  email_verified_at: string | null;
};

type VerificationRow = {
  id: string;
  account_id: string;
  expires_at: string;
};

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateVerificationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const number = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return String(Math.abs(number) % 1_000_000).padStart(6, "0");
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
      subject: "Your OpenClaw verification code",
      text: `Your OpenClaw verification code is ${input.code}. It expires in 10 minutes.`
    })
  });

  if (!response.ok) {
    throw new Error(`Unable to send verification email: ${response.status}`);
  }
}

export async function handleAccountsStart(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const body = await parseJson<StartSignupInput>(request);
  if (!body?.name || !body.email || !validEmail(body.email)) {
    return json({ error: "name and valid email are required" }, 400);
  }

  const db = requireDb(env);
  const email = body.email.toLowerCase();
  const tenants = createTenantRepository(db);
  let tenant = await tenants.findByEmail(email);
  if (!tenant) {
    tenant = await tenants.create({ name: body.name, email });
  }

  const existingAccount = await db
    .prepare("SELECT id, tenant_id, email_verified_at FROM accounts WHERE email = ?1 LIMIT 1")
    .bind(email)
    .first<AccountRow | null>();

  let accountId = existingAccount?.id;
  if (!accountId) {
    accountId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db
      .prepare(
        "INSERT INTO accounts (id, tenant_id, name, email, status, email_verified_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'pending_email_verification', NULL, ?5, ?6)"
      )
      .bind(accountId, tenant.id, body.name, email, now, now)
      .run();
  }

  const code = generateVerificationCode();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db
    .prepare(
      "INSERT INTO email_verification_codes (id, account_id, email, code, status, expires_at, created_at, used_at) VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, NULL)"
    )
    .bind(crypto.randomUUID(), accountId, email, code, expiresAt, now)
    .run();

  await sendVerificationEmail({ env, email, code });

  return json({
    ok: true,
    requiresVerification: true,
    // Return code only when email provider is not configured, so environments remain testable.
    devCode:
      !env.RESEND_API_KEY || !env.EMAIL_FROM
        ? code
        : undefined
  });
}

export async function handleAccountsVerify(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const body = await parseJson<VerifySignupInput>(request);
  if (!body?.email || !body.code) {
    return json({ error: "email and verification code are required" }, 400);
  }

  const email = body.email.toLowerCase();
  const code = body.code.trim();
  const db = requireDb(env);
  const verification = await db
    .prepare(
      "SELECT id, account_id, expires_at FROM email_verification_codes WHERE email = ?1 AND code = ?2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    )
    .bind(email, code)
    .first<VerificationRow | null>();

  if (!verification) {
    return json({ error: "invalid verification code" }, 400);
  }

  if (new Date(verification.expires_at).getTime() < Date.now()) {
    await db
      .prepare("UPDATE email_verification_codes SET status = 'expired' WHERE id = ?1")
      .bind(verification.id)
      .run();
    return json({ error: "verification code expired" }, 400);
  }

  await db
    .prepare("UPDATE email_verification_codes SET status = 'used', used_at = ?1 WHERE id = ?2")
    .bind(new Date().toISOString(), verification.id)
    .run();

  const account = await db
    .prepare("SELECT id, tenant_id, email_verified_at FROM accounts WHERE id = ?1 LIMIT 1")
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

  return json({
    ok: true,
    tenantId: account.tenant_id
  });
}
