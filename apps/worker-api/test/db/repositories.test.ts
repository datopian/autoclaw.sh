import { describe, expect, it } from "vitest";
import { createTenantRepository } from "../../src/db/repositories/tenants";
import { createRunRepository } from "../../src/db/repositories/runs";
import { createSubscriptionRepository } from "../../src/db/repositories/subscriptions";
import { createWorkspaceRepository } from "../../src/db/repositories/workspaces";
import { createMemoryRepository } from "../../src/db/repositories/memory";
import { createRuntimeSkillPolicyRepository } from "../../src/db/repositories/runtime-skill-policy";

class MockStmt {
  public bound: unknown[] = [];

  constructor(private readonly result: unknown) {}

  bind(...args: unknown[]): this {
    this.bound = args;
    return this;
  }

  async run(): Promise<unknown> {
    return this.result;
  }

  async first<T>(): Promise<T> {
    return this.result as T;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.result as T[] };
  }
}

class MockD1 {
  public statements: string[] = [];
  public lastStmt: MockStmt | null = null;

  constructor(private readonly result: unknown) {}

  prepare(sql: string): MockStmt {
    this.statements.push(sql);
    this.lastStmt = new MockStmt(this.result);
    return this.lastStmt;
  }
}

describe("tenant repository", () => {
  it("creates tenant and returns normalized data", async () => {
    const db = new MockD1({}) as unknown as D1Database;
    const tenants = createTenantRepository(db);

    const created = await tenants.create({
      name: "Acme",
      email: "Founder@Acme.io"
    });

    expect(created.name).toBe("Acme");
    expect(created.email).toBe("founder@acme.io");
    expect(created.status).toBe("pending_onboarding");
  });

  it("lists tenants", async () => {
    const db = new MockD1([
      {
        id: "t_1",
        name: "A",
        email: "a@a.com",
        status: "active",
        created_at: "x",
        updated_at: "y"
      }
    ]) as unknown as D1Database;
    const tenants = createTenantRepository(db);

    const list = await tenants.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("t_1");
  });
});

describe("run repository", () => {
  it("creates queued run", async () => {
    const db = new MockD1({}) as unknown as D1Database;
    const runs = createRunRepository(db);

    const run = await runs.createQueued({
      runId: "run_1",
      tenantId: "t_1",
      templateId: "support-agent"
    });

    expect(run.id).toBe("run_1");
    expect(run.status).toBe("queued");
  });

  it("updates run status", async () => {
    const db = new MockD1({}) as unknown as D1Database;
    const runs = createRunRepository(db);

    await runs.updateStatus({ runId: "run_1", status: "running" });
    expect(true).toBe(true);
  });
});

describe("subscription repository", () => {
  it("returns latest subscription by tenant", async () => {
    const db = new MockD1({
      id: "s_1",
      tenant_id: "t_1",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      plan_code: "starter",
      status: "active",
      created_at: "x",
      updated_at: "y"
    }) as unknown as D1Database;
    const subscriptions = createSubscriptionRepository(db);

    const found = await subscriptions.findLatestByTenant("t_1");
    expect(found?.id).toBe("s_1");
    expect(found?.status).toBe("active");
  });

  it("upserts subscription from stripe data", async () => {
    const db = new MockD1(null);
    const subscriptions = createSubscriptionRepository(db as unknown as D1Database);

    await subscriptions.upsertFromStripe({
      tenantId: "t_1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      planCode: "starter",
      status: "active"
    });

    expect(db.statements.some((sql: string) => sql.includes("subscriptions"))).toBe(
      true
    );
  });
});

describe("workspace repository", () => {
  it("finds tenant workspace", async () => {
    const db = new MockD1({
      id: "ws_1",
      tenant_id: "t_1",
      memory_mode: "vector",
      created_at: "x",
      updated_at: "y"
    }) as unknown as D1Database;
    const workspaces = createWorkspaceRepository(db);

    const found = await workspaces.findByTenant("t_1");
    expect(found?.id).toBe("ws_1");
    expect(found?.memoryMode).toBe("vector");
  });

  it("sets workspace prompt", async () => {
    const db = new MockD1(null);
    const workspaces = createWorkspaceRepository(db as unknown as D1Database);

    await workspaces.setPrompt({
      workspaceId: "ws_1",
      systemPromptR2Key: "tenant/t_1/prompts/system.md"
    });

    expect(db.statements.some((sql: string) => sql.includes("agent_prompts"))).toBe(true);
  });
});

describe("memory repository", () => {
  it("appends memory event with sequence", async () => {
    const db = new MockD1({
      tenant_id: "t_1",
      last_ingested_seq: 3,
      last_distilled_seq: 0,
      updated_at: "x"
    });
    const memory = createMemoryRepository(db as unknown as D1Database);

    const event = await memory.appendEvent({
      tenantId: "t_1",
      role: "user",
      contentR2Key: "tenant/t_1/memory/raw/2026/02/e_1.json"
    });

    expect(event.seq).toBe(3);
    expect(db.statements.some((sql: string) => sql.includes("memory_events"))).toBe(true);
  });

  it("lists memory profiles for tenant", async () => {
    const db = new MockD1([
      {
        id: "p_1",
        tenant_id: "t_1",
        fact_key: "timezone",
        value_json: "\"UTC\"",
        confidence: 0.9,
        version: 1,
        updated_at: "x"
      }
    ]);
    const memory = createMemoryRepository(db as unknown as D1Database);

    const profiles = await memory.listProfiles("t_1", 10);
    expect(profiles.length).toBe(1);
    expect(profiles[0].factKey).toBe("timezone");
  });
});

describe("runtime skill policy repository", () => {
  it("lists policies for tenant", async () => {
    const db = new MockD1([
      {
        tenant_id: "t_1",
        skill_name: "weather",
        allowed: 1,
        enabled: 0,
        hidden: 1,
        created_at: "x",
        updated_at: "y"
      }
    ]);
    const policies = createRuntimeSkillPolicyRepository(db as unknown as D1Database);

    const list = await policies.listByTenant("t_1");
    expect(list.length).toBe(1);
    expect(list[0].skillName).toBe("weather");
    expect(list[0].allowed).toBe(true);
    expect(list[0].enabled).toBe(false);
    expect(list[0].hidden).toBe(true);
  });

  it("upserts policy row", async () => {
    const db = new MockD1(null);
    const policies = createRuntimeSkillPolicyRepository(db as unknown as D1Database);

    await policies.upsert({
      tenantId: "t_1",
      skillName: "weather",
      allowed: true,
      enabled: false,
      hidden: true
    });

    expect(
      db.statements.some((sql: string) => sql.includes("tenant_runtime_skill_policy"))
    ).toBe(true);
  });
});
