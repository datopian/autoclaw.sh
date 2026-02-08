export type SubscriptionRecord = {
  id: string;
  tenantId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionRow = {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_code: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function toRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    planCode: row.plan_code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createSubscriptionRepository(db: D1Database) {
  return {
    async findLatestByTenant(tenantId: string): Promise<SubscriptionRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, tenant_id, stripe_customer_id, stripe_subscription_id, plan_code, status, created_at, updated_at FROM subscriptions WHERE tenant_id = ?1 ORDER BY updated_at DESC LIMIT 1"
        )
        .bind(tenantId)
        .first<SubscriptionRow | null>();

      return row ? toRecord(row) : null;
    },

    async upsertFromStripe(input: {
      tenantId: string;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      planCode: string;
      status: string;
    }): Promise<void> {
      const now = new Date().toISOString();
      const existing = input.stripeSubscriptionId
        ? await db
            .prepare("SELECT id FROM subscriptions WHERE stripe_subscription_id = ?1 LIMIT 1")
            .bind(input.stripeSubscriptionId)
            .first<{ id: string } | null>()
        : null;

      if (existing?.id) {
        await db
          .prepare(
            "UPDATE subscriptions SET tenant_id = ?1, stripe_customer_id = ?2, stripe_subscription_id = ?3, plan_code = ?4, status = ?5, updated_at = ?6 WHERE id = ?7"
          )
          .bind(
            input.tenantId,
            input.stripeCustomerId ?? null,
            input.stripeSubscriptionId ?? null,
            input.planCode,
            input.status,
            now,
            existing.id
          )
          .run();
        return;
      }

      await db
        .prepare(
          "INSERT INTO subscriptions (id, tenant_id, stripe_customer_id, stripe_subscription_id, plan_code, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
        )
        .bind(
          crypto.randomUUID(),
          input.tenantId,
          input.stripeCustomerId ?? null,
          input.stripeSubscriptionId ?? null,
          input.planCode,
          input.status,
          now,
          now
        )
        .run();
    }
  };
}
