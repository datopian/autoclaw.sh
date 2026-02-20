export type MemoryMode = "vector" | "hybrid" | "qmd";

export type WorkspaceRecord = {
  id: string;
  tenantId: string;
  memoryMode: MemoryMode;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceRow = {
  id: string;
  tenant_id: string;
  memory_mode: string;
  created_at: string;
  updated_at: string;
};

type PromptRow = {
  workspace_id: string;
  system_prompt_r2_key: string;
  version: number;
  updated_at: string;
};

type SkillRow = {
  id: string;
  workspace_id: string;
  name: string;
  kind: string;
  r2_key: string;
  enabled: number;
  updated_at: string;
};

function normalizeMemoryMode(value: string | null | undefined): MemoryMode {
  if (value === "hybrid" || value === "qmd") {
    return value;
  }
  return "vector";
}

function toWorkspaceRecord(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    memoryMode: normalizeMemoryMode(row.memory_mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createWorkspaceRepository(db: D1Database) {
  return {
    async findByTenant(tenantId: string): Promise<WorkspaceRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, tenant_id, memory_mode, created_at, updated_at FROM agent_workspaces WHERE tenant_id = ?1 LIMIT 1"
        )
        .bind(tenantId)
        .first<WorkspaceRow | null>();

      return row ? toWorkspaceRecord(row) : null;
    },

    async ensureForTenant(input: {
      tenantId: string;
      memoryMode?: MemoryMode;
    }): Promise<WorkspaceRecord> {
      const existing = await this.findByTenant(input.tenantId);
      if (existing) {
        return existing;
      }

      const now = new Date().toISOString();
      const workspaceId = crypto.randomUUID();
      const memoryMode = input.memoryMode ?? "vector";

      await db
        .prepare(
          "INSERT INTO agent_workspaces (id, tenant_id, memory_mode, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(workspaceId, input.tenantId, memoryMode, now, now)
        .run();

      return {
        id: workspaceId,
        tenantId: input.tenantId,
        memoryMode,
        createdAt: now,
        updatedAt: now
      };
    },

    async setMemoryMode(input: {
      tenantId: string;
      memoryMode: MemoryMode;
    }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE agent_workspaces SET memory_mode = ?1, updated_at = ?2 WHERE tenant_id = ?3"
        )
        .bind(input.memoryMode, now, input.tenantId)
        .run();
    },

    async getPrompt(workspaceId: string): Promise<PromptRow | null> {
      return await db
        .prepare(
          "SELECT workspace_id, system_prompt_r2_key, version, updated_at FROM agent_prompts WHERE workspace_id = ?1 LIMIT 1"
        )
        .bind(workspaceId)
        .first<PromptRow | null>();
    },

    async setPrompt(input: {
      workspaceId: string;
      systemPromptR2Key: string;
    }): Promise<void> {
      const now = new Date().toISOString();
      const existing = await this.getPrompt(input.workspaceId);

      if (existing) {
        await db
          .prepare(
            "UPDATE agent_prompts SET system_prompt_r2_key = ?1, version = version + 1, updated_at = ?2 WHERE workspace_id = ?3"
          )
          .bind(input.systemPromptR2Key, now, input.workspaceId)
          .run();
        return;
      }

      await db
        .prepare(
          "INSERT INTO agent_prompts (workspace_id, system_prompt_r2_key, version, updated_at) VALUES (?1, ?2, 1, ?3)"
        )
        .bind(input.workspaceId, input.systemPromptR2Key, now)
        .run();
    },

    async listEnabledSkills(workspaceId: string): Promise<SkillRow[]> {
      const result = await db
        .prepare(
          "SELECT id, workspace_id, name, kind, r2_key, enabled, updated_at FROM agent_skills WHERE workspace_id = ?1 AND enabled = 1 ORDER BY updated_at DESC"
        )
        .bind(workspaceId)
        .all<SkillRow>();

      return result.results;
    }
  };
}
