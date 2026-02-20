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
  getWatermark: (tenantId: string) => Promise<{
    tenantId: string;
    lastIngestedSeq: number;
    lastDistilledSeq: number;
    updatedAt: string;
  }>;
  markIngestedSeq: (tenantId: string, seq: number) => Promise<void>;
};

export async function processMemoryIngestBatch(
  batch: MessageBatch<MemoryIngestQueueMessage>,
  memory: MemoryWatermarkStore
): Promise<void> {
  for (const message of batch.messages) {
    const payload = message.body;
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
