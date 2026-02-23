import { describe, expect, it } from "vitest";
import worker from "../src/index";

type Env = {
  STRIPE_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  DB?: {
    prepare: (sql: string) => {
      bind: (...args: unknown[]) => {
        run: () => Promise<unknown>;
        all: <T>() => Promise<{ results: T[] }>;
        first: <T>() => Promise<T | null>;
      };
      all: <T>() => Promise<{ results: T[] }>;
      first: <T>() => Promise<T | null>;
    };
  };
  RUN_QUEUE?: { send: (payload: unknown) => Promise<void> };
};

function mockDb(options?: {
  allResults?: unknown[];
  firstResultBySql?: (sql: string) => unknown | null;
  statements?: string[];
}): NonNullable<Env["DB"]> {
  const allResults = options?.allResults ?? [];
  const statements = options?.statements;

  return {
    prepare: (sql: string) => {
      statements?.push(sql);
      const first = options?.firstResultBySql?.(sql) ?? null;
      return {
        bind: () => ({
        run: async () => ({}),
        all: async <T>() => ({ results: allResults as T[] }),
          first: async <T>() => first as T | null
      }),
        all: async <T>() => ({ results: allResults as T[] }),
        first: async <T>() => first as T | null
      };
    }
  };
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function invokeFetch(request: Request, env: Env): Promise<Response> {
  return worker.fetch!(
    request as unknown as Request<unknown, IncomingRequestCfProperties<unknown>>,
    env as never,
    {} as ExecutionContext
  );
}

async function sign(body: string, secret: string): Promise<string> {
  const timestamp = "1739030400";
  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}

describe("worker routing", () => {
  it("returns health response", async () => {
    const req = new Request("https://example.com/healthz");
    const res = await invokeFetch(req, { DB: mockDb() } as Env);

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true, service: "worker-api" });
  });

  it("lists templates", async () => {
    const req = new Request("https://example.com/api/templates");
    const res = await invokeFetch(req, { DB: mockDb() } as Env);

    expect(res.status).toBe(200);
    const payload = await json(res);
    expect(Array.isArray(payload.templates)).toBe(true);
  });

  it("creates run request", async () => {
    const req = new Request("https://example.com/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "t_123", templateId: "support-agent" })
    });

    const res = await invokeFetch(
      req,
      {
        RUN_QUEUE: {
          send: async () => {}
        },
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-19T06:00:00.000Z" }
              : sql.includes("FROM subscriptions")
                ? { status: "active", tenant_id: "t_123" }
                : null
        })
      } as Env
    );
    expect(res.status).toBe(202);

    const payload = await json(res);
    expect(payload.status).toBe("queued");
    expect(typeof payload.runId).toBe("string");
  });

  it("rejects run request when subscription is inactive", async () => {
    const req = new Request("https://example.com/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "t_123", templateId: "support-agent" })
    });

    const res = await invokeFetch(
      req,
      {
        RUN_QUEUE: {
          send: async () => {}
        },
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-15T01:00:00.000Z" }
              : sql.includes("FROM subscriptions")
                ? { status: "past_due", tenant_id: "t_123" }
                : null
        })
      } as Env
    );

    expect(res.status).toBe(402);
  });

  it("allows run request during trial without active subscription", async () => {
    const req = new Request("https://example.com/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "t_123", templateId: "support-agent" })
    });

    const res = await invokeFetch(
      req,
      {
        RUN_QUEUE: {
          send: async () => {}
        },
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: new Date().toISOString() }
              : sql.includes("FROM subscriptions")
                ? { status: "past_due", tenant_id: "t_123" }
                : null
        })
      } as Env
    );

    expect(res.status).toBe(202);
  });

  it("persists supported Stripe subscription events", async () => {
    const statements: string[] = [];
    const secret = "whsec_test";
    const body = JSON.stringify({
      id: "evt_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          metadata: { tenant_id: "tenant_1" },
          items: { data: [{ price: { id: "price_starter" } }] }
        }
      }
    });
    const signature = await sign(body, secret);
    const req = new Request("https://example.com/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature
      },
      body
    });

    const res = await invokeFetch(
      req,
      {
        STRIPE_WEBHOOK_SECRET: secret,
        DB: mockDb({ statements })
      } as Env
    );

    expect(res.status).toBe(200);
    expect(statements.some((sql) => sql.includes("subscriptions"))).toBe(true);
  });

  it("rejects invalid stripe webhook signature", async () => {
    const req = new Request("https://example.com/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "bad-signature"
      },
      body: JSON.stringify({ id: "evt_123", type: "invoice.paid" })
    });

    const res = await invokeFetch(
      req,
      { STRIPE_WEBHOOK_SECRET: "top-secret", DB: mockDb() } as Env
    );

    expect(res.status).toBe(401);
  });

  it("pairs telegram code to tenant", async () => {
    const req = new Request("https://example.com/api/telegram/pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "t_123", pairingCode: "ABC123" })
    });

    const res = await invokeFetch(
      req,
      {
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-19T06:00:00.000Z" }
              : sql.includes("FROM telegram_pairings")
                ? {
                    id: "p_1",
                    pairing_code: "ABC123",
                    status: "pending",
                    expires_at: "2099-01-01T00:00:00.000Z"
                  }
                : null
        })
      } as Env
    );

    expect(res.status).toBe(200);
    const payload = await json(res);
    expect(payload.ok).toBe(true);
  });

  it("stores tenant agent config", async () => {
    const req = new Request("https://example.com/api/tenants/agent-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "t_123",
        modelProvider: "google",
        modelId: "gemini-2.5-pro",
        byokApiKey: "sk-key"
      })
    });

    const res = await invokeFetch(
      req,
      {
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-19T06:00:00.000Z" }
              : null
        })
      } as Env
    );

    expect(res.status).toBe(200);
    const payload = await json(res);
    expect(payload.ok).toBe(true);
  });

  it("validates runtime skills GET tenantId", async () => {
    const req = new Request("https://example.com/api/runtime/skills");
    const res = await invokeFetch(req, { DB: mockDb() } as Env);

    expect(res.status).toBe(400);
    const payload = await json(res);
    expect(payload.error).toBe("tenantId is required");
  });

  it("stores runtime skill policies", async () => {
    const req = new Request("https://example.com/api/runtime/skills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "t_123",
        policies: [{ name: "weather", enabled: false, hidden: true }]
      })
    });

    const res = await invokeFetch(
      req,
      {
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-19T06:00:00.000Z" }
              : null
        })
      } as Env
    );

    expect(res.status).toBe(200);
    const payload = await json(res);
    expect(payload.ok).toBe(true);
    expect(payload.tenantId).toBe("t_123");
  });

  it("lists skill packs", async () => {
    const req = new Request("https://example.com/api/runtime/skills/packs");
    const res = await invokeFetch(req, { DB: mockDb() } as Env);

    expect(res.status).toBe(200);
    const payload = await json(res);
    expect(Array.isArray(payload.packs)).toBe(true);
  });

  it("applies a skill pack", async () => {
    const req = new Request("https://example.com/api/runtime/skills/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "t_123",
        pack: "basic"
      })
    });

    const res = await invokeFetch(
      req,
      {
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-19T06:00:00.000Z" }
              : null
        })
      } as Env
    );

    expect(res.status).toBe(200);
    const payload = await json(res);
    expect(payload.pack).toBe("basic");
  });

  it("validates diagnostics tenantId", async () => {
    const req = new Request("https://example.com/api/runtime/skills/diagnostics");
    const res = await invokeFetch(req, { DB: mockDb() } as Env);

    expect(res.status).toBe(400);
    const payload = await json(res);
    expect(payload.error).toBe("tenantId is required");
  });

  it("validates remediation strategy", async () => {
    const req = new Request("https://example.com/api/runtime/skills/remediate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "t_123",
        strategy: "bad-strategy"
      })
    });

    const res = await invokeFetch(
      req,
      {
        DB: mockDb({
          firstResultBySql: (sql) =>
            sql.includes("FROM tenants")
              ? { id: "t_123", created_at: "2026-02-19T06:00:00.000Z" }
              : null
        })
      } as Env
    );

    expect(res.status).toBe(400);
    const payload = await json(res);
    expect(payload.error).toBe("strategy must be hide_unavailable or enable_ready");
  });

  it("returns 404 for unknown routes", async () => {
    const req = new Request("https://example.com/api/nope");
    const res = await invokeFetch(req, { DB: mockDb() } as Env);

    expect(res.status).toBe(404);
  });
});
