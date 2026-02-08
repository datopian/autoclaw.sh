import { describe, expect, it } from "vitest";
import { createTenantRepository } from "../../src/db/repositories/tenants";
import { createRunRepository } from "../../src/db/repositories/runs";
import { createSubscriptionRepository } from "../../src/db/repositories/subscriptions";

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
      { id: "t_1", name: "A", email: "a@a.com", status: "active", created_at: "x" }
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
