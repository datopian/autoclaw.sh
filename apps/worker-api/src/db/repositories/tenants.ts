export type TenantRecord = {
  id: string;
  name: string;
  email: string;
  status: string;
  modelProvider: string | null;
  modelId: string | null;
  byokApiKey: string | null;
  createdAt: string;
  updatedAt: string;
};

type TenantRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  model_provider: string | null;
  model_id: string | null;
  byok_api_key: string | null;
  created_at: string;
  updated_at: string;
};

function toRecord(row: TenantRow): TenantRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    modelProvider: row.model_provider,
    modelId: row.model_id,
    byokApiKey: row.byok_api_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createTenantRepository(db: D1Database) {
  return {
    async list(): Promise<TenantRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, name, email, status, model_provider, model_id, byok_api_key, created_at, updated_at FROM tenants ORDER BY created_at DESC"
        )
        .all<TenantRow>();

      return result.results.map(toRecord);
    },

    async findById(id: string): Promise<TenantRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, name, email, status, model_provider, model_id, byok_api_key, created_at, updated_at FROM tenants WHERE id = ?1 LIMIT 1"
        )
        .bind(id)
        .first<TenantRow | null>();

      return row ? toRecord(row) : null;
    },

    async findByEmail(email: string): Promise<TenantRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, name, email, status, model_provider, model_id, byok_api_key, created_at, updated_at FROM tenants WHERE email = ?1 LIMIT 1"
        )
        .bind(email.toLowerCase())
        .first<TenantRow | null>();

      return row ? toRecord(row) : null;
    },

    async create(input: { name: string; email: string }): Promise<TenantRecord> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const email = input.email.toLowerCase();
      const status = "pending_onboarding";

      await db
        .prepare(
          "INSERT INTO tenants (id, name, email, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        )
        .bind(id, input.name, email, status, now, now)
        .run();

      return {
        id,
        name: input.name,
        email,
        status,
        modelProvider: null,
        modelId: null,
        byokApiKey: null,
        createdAt: now,
        updatedAt: now
      };
    },

    async updateAgentConfig(input: {
      tenantId: string;
      modelProvider: string;
      modelId: string;
      byokApiKey: string;
    }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE tenants SET model_provider = ?1, model_id = ?2, byok_api_key = ?3, status = 'active', updated_at = ?4 WHERE id = ?5"
        )
        .bind(
          input.modelProvider,
          input.modelId,
          input.byokApiKey,
          now,
          input.tenantId
        )
        .run();
    }
  };
}
