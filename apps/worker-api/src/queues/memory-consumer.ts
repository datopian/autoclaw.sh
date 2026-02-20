import { buildLocalEmbedding } from "../services/embeddings";

export type MemoryIngestQueueMessage = {
  tenantId: string;
  eventId: string;
  seq: number;
  eventTime: string;
};

export type MemoryDistillQueueMessage = {
  tenantId: string;
  scope: string;
  seqFrom: number;
  seqTo: number;
};

type MemoryWatermarkStore = {
  findEventById: (
    tenantId: string,
    eventId: string
  ) => Promise<{
    id: string;
    tenantId: string;
    role: string;
    contentR2Key: string;
    createdAt: string;
  } | null>;
  listChunksByEvent: (
    tenantId: string,
    eventId: string
  ) => Promise<Array<{ id: string }>>;
  upsertChunk: (input: {
    id: string;
    tenantId: string;
    eventId: string;
    r2Key: string;
    tokenCount?: number | null;
  }) => Promise<void>;
  upsertVector: (input: {
    chunkId: string;
    tenantId: string;
    vectorId: string;
    embeddingModel: string;
    status: string;
  }) => Promise<void>;
  getWatermark: (tenantId: string) => Promise<{
    tenantId: string;
    lastIngestedSeq: number;
    lastDistilledSeq: number;
    updatedAt: string;
  }>;
  markIngestedSeq: (tenantId: string, seq: number) => Promise<void>;
};

type MemoryArtifactsStore = {
  get: (key: string) => Promise<R2ObjectBody | null>;
  put: (
    key: string,
    value: string,
    options?: R2PutOptions
  ) => Promise<R2Object | null>;
};

function splitTextIntoChunks(text: string, chunkSize = 600, overlap = 120): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf(" ", end);
      if (breakAt > start + 80) {
        end = breakAt;
      }
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    if (end >= normalized.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function buildChunkObjectKey(input: { tenantId: string; eventId: string; chunkIndex: number; at: Date }): string {
  const yyyy = String(input.at.getUTCFullYear());
  const mm = String(input.at.getUTCMonth() + 1).padStart(2, "0");
  return `tenant/${input.tenantId}/memory/chunks/${yyyy}/${mm}/${input.eventId}-${input.chunkIndex}.json`;
}

export async function processMemoryIngestBatch(
  batch: MessageBatch<MemoryIngestQueueMessage>,
  deps: {
    memory: MemoryWatermarkStore;
    artifacts: MemoryArtifactsStore;
    embeddingModel?: string;
    embedText?: (text: string) => Promise<number[]>;
  }
): Promise<void> {
  const model = deps.embeddingModel ?? "local-lexical-v1";
  const embedText =
    deps.embedText ??
    (async (text: string) => buildLocalEmbedding(text));
  for (const message of batch.messages) {
    const payload = message.body;
    const { memory } = deps;
    const watermark = await memory.getWatermark(payload.tenantId);

    if (payload.seq <= watermark.lastIngestedSeq) {
      // Duplicate delivery or replay; safe to ignore.
      message.ack();
      continue;
    }

    const expected = watermark.lastIngestedSeq + 1;
    if (payload.seq !== expected) {
      // Queue ordering is not guaranteed. Retry until preceding sequence lands.
      message.retry();
      continue;
    }

    const event = await memory.findEventById(payload.tenantId, payload.eventId);
    if (!event) {
      // Event row not persisted yet; retry.
      message.retry();
      continue;
    }

    const existing = await memory.listChunksByEvent(payload.tenantId, payload.eventId);
    if (existing.length > 0) {
      await memory.markIngestedSeq(payload.tenantId, payload.seq);
      message.ack();
      continue;
    }

    const source = await deps.artifacts.get(event.contentR2Key);
    if (!source) {
      message.retry();
      continue;
    }
    const sourceBody = await source.text();
    let sourceText = "";
    try {
      const parsed = JSON.parse(sourceBody) as { text?: unknown };
      sourceText = typeof parsed.text === "string" ? parsed.text : "";
    } catch {
      sourceText = "";
    }

    const chunks = splitTextIntoChunks(sourceText);
    const createdAt = new Date(event.createdAt);
    for (let index = 0; index < chunks.length; index += 1) {
      const text = chunks[index];
      const chunkId = `${event.id}:${index}`;
      const r2Key = buildChunkObjectKey({
        tenantId: payload.tenantId,
        eventId: event.id,
        chunkIndex: index,
        at: createdAt
      });
      const embedding = await embedText(text);
      await deps.artifacts.put(
        r2Key,
        JSON.stringify(
          {
            schemaVersion: "1",
            eventId: event.id,
            tenantId: payload.tenantId,
            role: event.role,
            chunkIndex: index,
            text,
            embeddingModel: model,
            embedding
          },
          null,
          2
        ),
        { httpMetadata: { contentType: "application/json" } }
      );
      await memory.upsertChunk({
        id: chunkId,
        tenantId: payload.tenantId,
        eventId: event.id,
        r2Key,
        tokenCount: text.split(/\s+/).filter(Boolean).length
      });
      await memory.upsertVector({
        chunkId,
        tenantId: payload.tenantId,
        vectorId: `${payload.tenantId}:${chunkId}`,
        embeddingModel: model,
        status: "ready"
      });
    }

    await memory.markIngestedSeq(payload.tenantId, payload.seq);
    message.ack();
  }
}

export async function processMemoryDistillBatch(
  batch: MessageBatch<MemoryDistillQueueMessage>
): Promise<void> {
  for (const message of batch.messages) {
    // Phase 3 scope; keep consumer safe and explicit for now.
    message.ack();
  }
}
