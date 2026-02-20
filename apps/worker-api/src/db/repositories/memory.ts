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

export type MemoryChunkRecord = {
  id: string;
  tenantId: string;
  eventId: string;
  r2Key: string;
  tokenCount: number | null;
  createdAt: string;
};

type MemoryEventRow = {
  id: string;
  tenant_id: string;
  session_id: string | null;
  role: string;
  content_r2_key: string;
  seq: number;
  redaction_version: string | null;
  created_at: string;
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

type MemoryChunkRow = {
  id: string;
  tenant_id: string;
  event_id: string;
  r2_key: string;
  token_count: number | null;
  created_at: string;
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

function toEventRecord(row: MemoryEventRow): MemoryEventRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sessionId: row.session_id,
    role: row.role,
    contentR2Key: row.content_r2_key,
    seq: row.seq,
    redactionVersion: row.redaction_version,
    createdAt: row.created_at
  };
}

function toChunkRecord(row: MemoryChunkRow): MemoryChunkRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    r2Key: row.r2_key,
    tokenCount: row.token_count,
    createdAt: row.created_at
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

    async getWatermark(tenantId: string): Promise<{
      tenantId: string;
      lastIngestedSeq: number;
      lastDistilledSeq: number;
      updatedAt: string;
    }> {
      await this.ensureWatermark(tenantId);
      const row = await db
        .prepare(
          "SELECT tenant_id, last_ingested_seq, last_distilled_seq, updated_at FROM memory_seq_watermarks WHERE tenant_id = ?1 LIMIT 1"
        )
        .bind(tenantId)
        .first<WatermarkRow | null>();
      if (!row) {
        throw new Error("missing memory watermark row");
      }
      return {
        tenantId: row.tenant_id,
        lastIngestedSeq: row.last_ingested_seq,
        lastDistilledSeq: row.last_distilled_seq,
        updatedAt: row.updated_at
      };
    },

    async markIngestedSeq(tenantId: string, seq: number): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE memory_seq_watermarks SET last_ingested_seq = ?1, updated_at = ?2 WHERE tenant_id = ?3 AND last_ingested_seq < ?1"
        )
        .bind(seq, now, tenantId)
        .run();
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

    async findEventById(
      tenantId: string,
      eventId: string
    ): Promise<MemoryEventRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, tenant_id, session_id, role, content_r2_key, seq, redaction_version, created_at FROM memory_events WHERE tenant_id = ?1 AND id = ?2 LIMIT 1"
        )
        .bind(tenantId, eventId)
        .first<MemoryEventRow | null>();

      return row ? toEventRecord(row) : null;
    },

    async listChunksByEvent(
      tenantId: string,
      eventId: string
    ): Promise<MemoryChunkRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, tenant_id, event_id, r2_key, token_count, created_at FROM memory_chunks WHERE tenant_id = ?1 AND event_id = ?2 ORDER BY created_at ASC"
        )
        .bind(tenantId, eventId)
        .all<MemoryChunkRow>();
      return result.results.map(toChunkRecord);
    },

    async upsertChunk(input: {
      id: string;
      tenantId: string;
      eventId: string;
      r2Key: string;
      tokenCount?: number | null;
    }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT OR IGNORE INTO memory_chunks (id, tenant_id, event_id, r2_key, token_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        )
        .bind(
          input.id,
          input.tenantId,
          input.eventId,
          input.r2Key,
          input.tokenCount ?? null,
          now
        )
        .run();
    },

    async upsertVector(input: {
      chunkId: string;
      tenantId: string;
      vectorId: string;
      embeddingModel: string;
      status: string;
    }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO memory_vectors (chunk_id, tenant_id, vector_id, embedding_model, status, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(chunk_id) DO UPDATE SET vector_id = excluded.vector_id, embedding_model = excluded.embedding_model, status = excluded.status, updated_at = excluded.updated_at"
        )
        .bind(
          input.chunkId,
          input.tenantId,
          input.vectorId,
          input.embeddingModel,
          input.status,
          now
        )
        .run();
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
    },

    async listRecentEvents(
      tenantId: string,
      limit = 8
    ): Promise<MemoryEventRecord[]> {
      const result = await db
        .prepare(
          "SELECT id, tenant_id, session_id, role, content_r2_key, seq, redaction_version, created_at FROM memory_events WHERE tenant_id = ?1 ORDER BY seq DESC LIMIT ?2"
        )
        .bind(tenantId, limit)
        .all<MemoryEventRow>();
      return result.results.map(toEventRecord);
    }
  };
}
