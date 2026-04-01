export type TenantOpenClawRuntimeRecord = {
  tenantId: string;
  gatewayToken: string;
  workspacePrefix: string;
  sleepAfter: string;
  status: string;
  bootstrappedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TenantOpenClawRuntimeRow = {
  tenant_id: string;
  gateway_token: string;
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
    gatewayToken: row.gateway_token,
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
          "SELECT tenant_id, gateway_token, workspace_prefix, sleep_after, status, bootstrapped_at, created_at, updated_at FROM tenant_openclaw_runtime WHERE tenant_id = ?1 LIMIT 1"
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
      const now = new Date().toISOString();
      const gatewayToken = crypto.randomUUID();
      await db
        .prepare(
          "INSERT OR IGNORE INTO tenant_openclaw_runtime (tenant_id, gateway_token, workspace_prefix, sleep_after, status, bootstrapped_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'bootstrapping', NULL, ?5, ?6)"
        )
        .bind(input.tenantId, gatewayToken, input.workspacePrefix, input.sleepAfter, now, now)
        .run();

      const ensured = await this.findByTenantId(input.tenantId);
      if (!ensured) {
        throw new Error("failed to ensure runtime record");
      }
      return ensured;
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

    async setStatus(
      tenantId: string,
      status: "bootstrapping" | "bootstrapped" | "starting" | "running" | "failed"
    ): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE tenant_openclaw_runtime SET status = ?1, updated_at = ?2 WHERE tenant_id = ?3"
        )
        .bind(status, now, tenantId)
        .run();
    },

    async tryMarkStarting(tenantId: string): Promise<boolean> {
      const now = new Date().toISOString();
      const result = await db
        .prepare(
          "UPDATE tenant_openclaw_runtime SET status = 'starting', updated_at = ?1 WHERE tenant_id = ?2 AND status <> 'starting'"
        )
        .bind(now, tenantId)
        .run();
      return (result.meta.changes ?? 0) > 0;
    },

    async ensureGatewayToken(tenantId: string): Promise<string> {
      const existing = await this.findByTenantId(tenantId);
      if (existing?.gatewayToken?.trim()) {
        return existing.gatewayToken;
      }
      const token = crypto.randomUUID();
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE tenant_openclaw_runtime SET gateway_token = ?1, updated_at = ?2 WHERE tenant_id = ?3"
        )
        .bind(token, now, tenantId)
        .run();
      return token;
    }
  };
}
