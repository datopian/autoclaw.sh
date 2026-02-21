export type TenantOpenClawRuntimeRecord = {
  tenantId: string;
  workspacePrefix: string;
  sleepAfter: string;
  status: string;
  bootstrappedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TenantOpenClawRuntimeRow = {
  tenant_id: string;
  workspace_prefix: string;
  sleep_after: string;
  status: string;
  bootstrapped_at: string | null;
  created_at: string;
  updated_at: string;
};

function toRecord(row: TenantOpenClawRuntimeRow): TenantOpenClawRuntimeRecord {
  return {
    tenantId: row.tenant_id,
    workspacePrefix: row.workspace_prefix,
    sleepAfter: row.sleep_after,
    status: row.status,
    bootstrappedAt: row.bootstrapped_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createTenantOpenClawRuntimeRepository(db: D1Database) {
  return {
    async findByTenantId(tenantId: string): Promise<TenantOpenClawRuntimeRecord | null> {
      const row = await db
        .prepare(
          "SELECT tenant_id, workspace_prefix, sleep_after, status, bootstrapped_at, created_at, updated_at FROM tenant_openclaw_runtime WHERE tenant_id = ?1 LIMIT 1"
        )
        .bind(tenantId)
        .first<TenantOpenClawRuntimeRow | null>();
      return row ? toRecord(row) : null;
    },

    async ensure(input: {
      tenantId: string;
      workspacePrefix: string;
      sleepAfter: string;
    }): Promise<TenantOpenClawRuntimeRecord> {
      const existing = await this.findByTenantId(input.tenantId);
      if (existing) {
        return existing;
      }

      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO tenant_openclaw_runtime (tenant_id, workspace_prefix, sleep_after, status, bootstrapped_at, created_at, updated_at) VALUES (?1, ?2, ?3, 'bootstrapping', NULL, ?4, ?5)"
        )
        .bind(input.tenantId, input.workspacePrefix, input.sleepAfter, now, now)
        .run();

      return {
        tenantId: input.tenantId,
        workspacePrefix: input.workspacePrefix,
        sleepAfter: input.sleepAfter,
        status: "bootstrapping",
        bootstrappedAt: null,
        createdAt: now,
        updatedAt: now
      };
    },

    async markBootstrapped(tenantId: string): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE tenant_openclaw_runtime SET status = 'bootstrapped', bootstrapped_at = COALESCE(bootstrapped_at, ?1), updated_at = ?2 WHERE tenant_id = ?3"
        )
        .bind(now, now, tenantId)
        .run();
    },

    async setStatus(tenantId: string, status: string): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE tenant_openclaw_runtime SET status = ?1, updated_at = ?2 WHERE tenant_id = ?3"
        )
        .bind(status, now, tenantId)
        .run();
    }
  };
}
