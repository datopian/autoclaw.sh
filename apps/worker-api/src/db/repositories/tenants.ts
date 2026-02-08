export type TenantRecord = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
};

type TenantRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

export function createTenantRepository(db: D1Database) {
  return {
    async list(): Promise<TenantRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, name, email, status, created_at FROM tenants ORDER BY created_at DESC"
        )
        .all<TenantRow>();

      return result.results.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status,
        createdAt: row.created_at
      }));
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
        createdAt: now
      };
    }
  };
}
