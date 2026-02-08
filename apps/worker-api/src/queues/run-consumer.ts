import type { RunQueueMessage } from "../services/run-orchestrator";

export async function processRunBatch(
  batch: MessageBatch<RunQueueMessage>,
  orchestrator: { process: (message: RunQueueMessage) => Promise<void> }
): Promise<void> {
  for (const message of batch.messages) {
    await orchestrator.process(message.body);
    message.ack();
  }
}
