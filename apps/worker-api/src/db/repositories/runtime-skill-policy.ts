export type RuntimeSkillPolicyRecord = {
  tenantId: string;
  skillName: string;
  allowed: boolean;
  enabled: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

type RuntimeSkillPolicyRow = {
  tenant_id: string;
  skill_name: string;
  allowed: number;
  enabled: number;
  hidden: number;
  created_at: string;
  updated_at: string;
};

function toPolicyRecord(row: RuntimeSkillPolicyRow): RuntimeSkillPolicyRecord {
  return {
    tenantId: row.tenant_id,
    skillName: row.skill_name,
    allowed: row.allowed === 1,
    enabled: row.enabled === 1,
    hidden: row.hidden === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createRuntimeSkillPolicyRepository(db: D1Database) {
  return {
    async listByTenant(tenantId: string): Promise<RuntimeSkillPolicyRecord[]> {
      const result = await db
        .prepare(
          "SELECT tenant_id, skill_name, allowed, enabled, hidden, created_at, updated_at FROM tenant_runtime_skill_policy WHERE tenant_id = ?1 ORDER BY skill_name ASC"
        )
        .bind(tenantId)
        .all<RuntimeSkillPolicyRow>();

      return result.results.map(toPolicyRecord);
    },

    async upsert(input: {
      tenantId: string;
      skillName: string;
      allowed?: boolean;
      enabled?: boolean;
      hidden?: boolean;
    }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO tenant_runtime_skill_policy (tenant_id, skill_name, allowed, enabled, hidden, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(tenant_id, skill_name) DO UPDATE SET allowed = excluded.allowed, enabled = excluded.enabled, hidden = excluded.hidden, updated_at = excluded.updated_at"
        )
        .bind(
          input.tenantId,
          input.skillName,
          input.allowed === false ? 0 : 1,
          input.enabled === false ? 0 : 1,
          input.hidden === true ? 1 : 0,
          now,
          now
        )
        .run();
    }
  };
}
