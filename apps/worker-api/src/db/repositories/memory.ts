export type MemoryEventRecord = {
  id: string;
  tenantId: string;
  sessionId: string | null;
  role: string;
  contentR2Key: string;
  seq: number;
  redactionVersion: string | null;
  createdAt: string;
};

export type MemoryProfileRecord = {
  id: string;
  tenantId: string;
  factKey: string;
  valueJson: string;
  confidence: number | null;
  version: number;
  updatedAt: string;
};

type WatermarkRow = {
  tenant_id: string;
  last_ingested_seq: number;
  last_distilled_seq: number;
  updated_at: string;
};

type MemoryProfileRow = {
  id: string;
  tenant_id: string;
  fact_key: string;
  value_json: string;
  confidence: number | null;
  version: number;
  updated_at: string;
};

function toProfileRecord(row: MemoryProfileRow): MemoryProfileRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    factKey: row.fact_key,
    valueJson: row.value_json,
    confidence: row.confidence,
    version: row.version,
    updatedAt: row.updated_at
  };
}

export function createMemoryRepository(db: D1Database) {
  return {
    async ensureWatermark(tenantId: string): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT OR IGNORE INTO memory_seq_watermarks (tenant_id, last_ingested_seq, last_distilled_seq, updated_at) VALUES (?1, 0, 0, ?2)"
        )
        .bind(tenantId, now)
        .run();
    },

    async nextIngestSeq(tenantId: string): Promise<number> {
      await this.ensureWatermark(tenantId);
      const now = new Date().toISOString();

      await db
        .prepare(
          "UPDATE memory_seq_watermarks SET last_ingested_seq = last_ingested_seq + 1, updated_at = ?1 WHERE tenant_id = ?2"
        )
        .bind(now, tenantId)
        .run();

      const row = await db
        .prepare(
          "SELECT tenant_id, last_ingested_seq, last_distilled_seq, updated_at FROM memory_seq_watermarks WHERE tenant_id = ?1 LIMIT 1"
        )
        .bind(tenantId)
        .first<WatermarkRow | null>();

      if (!row) {
        throw new Error("failed to update memory sequence watermark");
      }

      return row.last_ingested_seq;
    },

    async appendEvent(input: {
      tenantId: string;
      sessionId?: string | null;
      role: string;
      contentR2Key: string;
      redactionVersion?: string | null;
      eventId?: string;
      seq?: number;
    }): Promise<MemoryEventRecord> {
      const id = input.eventId ?? crypto.randomUUID();
      const seq = input.seq ?? (await this.nextIngestSeq(input.tenantId));
      const now = new Date().toISOString();

      await db
        .prepare(
          "INSERT INTO memory_events (id, tenant_id, session_id, role, content_r2_key, seq, redaction_version, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
        )
        .bind(
          id,
          input.tenantId,
          input.sessionId ?? null,
          input.role,
          input.contentR2Key,
          seq,
          input.redactionVersion ?? null,
          now
        )
        .run();

      return {
        id,
        tenantId: input.tenantId,
        sessionId: input.sessionId ?? null,
        role: input.role,
        contentR2Key: input.contentR2Key,
        seq,
        redactionVersion: input.redactionVersion ?? null,
        createdAt: now
      };
    },

    async upsertProfile(input: {
      tenantId: string;
      factKey: string;
      valueJson: string;
      confidence?: number | null;
    }): Promise<void> {
      const now = new Date().toISOString();
      const existing = await db
        .prepare(
          "SELECT id FROM memory_profiles WHERE tenant_id = ?1 AND fact_key = ?2 LIMIT 1"
        )
        .bind(input.tenantId, input.factKey)
        .first<{ id: string } | null>();

      if (existing) {
        await db
          .prepare(
            "UPDATE memory_profiles SET value_json = ?1, confidence = ?2, version = version + 1, updated_at = ?3 WHERE id = ?4"
          )
          .bind(input.valueJson, input.confidence ?? null, now, existing.id)
          .run();
        return;
      }

      await db
        .prepare(
          "INSERT INTO memory_profiles (id, tenant_id, fact_key, value_json, confidence, version, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)"
        )
        .bind(
          crypto.randomUUID(),
          input.tenantId,
          input.factKey,
          input.valueJson,
          input.confidence ?? null,
          now
        )
        .run();
    },

    async listProfiles(tenantId: string, limit = 20): Promise<MemoryProfileRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, tenant_id, fact_key, value_json, confidence, version, updated_at FROM memory_profiles WHERE tenant_id = ?1 ORDER BY updated_at DESC LIMIT ?2"
        )
        .bind(tenantId, limit)
        .all<MemoryProfileRow>();

      return result.results.map(toProfileRecord);
    }
  };
}
