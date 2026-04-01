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

export type SkillRecord = {
  id: string;
  workspaceId: string;
  name: string;
  kind: string;
  r2Key: string;
  enabled: boolean;
  updatedAt: string;
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

function toSkillRecord(row: SkillRow): SkillRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    kind: row.kind,
    r2Key: row.r2_key,
    enabled: row.enabled === 1,
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

    async listSkills(workspaceId: string): Promise<SkillRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, workspace_id, name, kind, r2_key, enabled, updated_at FROM agent_skills WHERE workspace_id = ?1 ORDER BY updated_at DESC"
        )
        .bind(workspaceId)
        .all<SkillRow>();

      return result.results.map(toSkillRecord);
    },

    async listEnabledSkills(workspaceId: string): Promise<SkillRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, workspace_id, name, kind, r2_key, enabled, updated_at FROM agent_skills WHERE workspace_id = ?1 AND enabled = 1 ORDER BY updated_at DESC"
        )
        .bind(workspaceId)
        .all<SkillRow>();

      return result.results.map(toSkillRecord);
    },

    async findSkill(workspaceId: string, skillId: string): Promise<SkillRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, workspace_id, name, kind, r2_key, enabled, updated_at FROM agent_skills WHERE workspace_id = ?1 AND id = ?2 LIMIT 1"
        )
        .bind(workspaceId, skillId)
        .first<SkillRow | null>();
      return row ? toSkillRecord(row) : null;
    },

    async createSkill(input: {
      workspaceId: string;
      name: string;
      kind: string;
      r2Key: string;
      enabled?: boolean;
      skillId?: string;
    }): Promise<SkillRecord> {
      const id = input.skillId ?? crypto.randomUUID();
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO agent_skills (id, workspace_id, name, kind, r2_key, enabled, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )
        .bind(
          id,
          input.workspaceId,
          input.name.trim(),
          input.kind.trim() || "instruction",
          input.r2Key,
          input.enabled === false ? 0 : 1,
          now
        )
        .run();
      return {
        id,
        workspaceId: input.workspaceId,
        name: input.name.trim(),
        kind: input.kind.trim() || "instruction",
        r2Key: input.r2Key,
        enabled: input.enabled !== false,
        updatedAt: now
      };
    },

    async updateSkill(input: {
      workspaceId: string;
      skillId: string;
      name: string;
      kind: string;
      r2Key: string;
      enabled: boolean;
    }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE agent_skills SET name = ?1, kind = ?2, r2_key = ?3, enabled = ?4, updated_at = ?5 WHERE workspace_id = ?6 AND id = ?7"
        )
        .bind(
          input.name.trim(),
          input.kind.trim() || "instruction",
          input.r2Key,
          input.enabled ? 1 : 0,
          now,
          input.workspaceId,
          input.skillId
        )
        .run();
    },

    async deleteSkill(workspaceId: string, skillId: string): Promise<void> {
      await db
        .prepare("DELETE FROM agent_skills WHERE workspace_id = ?1 AND id = ?2")
        .bind(workspaceId, skillId)
        .run();
    }
  };
}
