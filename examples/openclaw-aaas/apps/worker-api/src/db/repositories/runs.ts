export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type RunRecord = {
  id: string;
  tenantId: string;
  templateId: string;
  status: RunStatus;
  queuedAt: string;
};

export function createRunRepository(db: D1Database) {
  async function updateStatus(input: {
    runId: string;
    status: RunStatus;
    errorMessage?: string;
  }): Promise<void> {
    await db
      .prepare(
        "UPDATE runs SET status = ?1, error_message = ?2, updated_at = ?3 WHERE id = ?4"
      )
      .bind(
        input.status,
        input.errorMessage ?? null,
        new Date().toISOString(),
        input.runId
      )
      .run();
  }

  return {
    async createQueued(input: {
      runId: string;
      tenantId: string;
      templateId: string;
    }): Promise<RunRecord> {
      const now = new Date().toISOString();

      await db
        .prepare(
          "INSERT INTO runs (id, tenant_id, template_id, status, queued_at, created_at, updated_at) VALUES (?1, ?2, ?3, 'queued', ?4, ?5, ?6)"
        )
        .bind(input.runId, input.tenantId, input.templateId, now, now, now)
        .run();

      return {
        id: input.runId,
        tenantId: input.tenantId,
        templateId: input.templateId,
        status: "queued",
        queuedAt: now
      };
    },

    async updateStatus(input: {
      runId: string;
      status: RunStatus;
      errorMessage?: string;
    }): Promise<void> {
      await updateStatus(input);
    },

    async markRunning(runId: string): Promise<void> {
      await db
        .prepare(
          "UPDATE runs SET status = 'running', started_at = ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind(new Date().toISOString(), new Date().toISOString(), runId)
        .run();
    },

    async markSucceeded(runId: string): Promise<void> {
      await db
        .prepare(
          "UPDATE runs SET status = 'succeeded', finished_at = ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind(new Date().toISOString(), new Date().toISOString(), runId)
        .run();
    },

    async markFailed(runId: string, errorMessage: string): Promise<void> {
      await db
        .prepare(
          "UPDATE runs SET status = 'failed', error_message = ?1, finished_at = ?2, updated_at = ?3 WHERE id = ?4"
        )
        .bind(
          errorMessage,
          new Date().toISOString(),
          new Date().toISOString(),
          runId
        )
        .run();
    }
  };
}
