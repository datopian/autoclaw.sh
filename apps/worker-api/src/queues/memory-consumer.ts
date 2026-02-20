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

export async function processMemoryIngestBatch(
  batch: MessageBatch<MemoryIngestQueueMessage>
): Promise<void> {
  for (const message of batch.messages) {
    // Phase 1 kickoff: binding + routing scaffold only.
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
