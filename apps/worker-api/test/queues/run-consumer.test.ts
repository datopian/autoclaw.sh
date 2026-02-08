import { describe, expect, it, vi } from "vitest";
import { processRunBatch } from "../../src/queues/run-consumer";
import type { RunQueueMessage } from "../../src/services/run-orchestrator";

describe("run queue consumer", () => {
  it("acks every processed message", async () => {
    const ackA = vi.fn();
    const ackB = vi.fn();

    const batch = {
      messages: [
        {
          body: { runId: "run_1", tenantId: "t1", templateId: "support-agent" },
          ack: ackA
        },
        {
          body: { runId: "run_2", tenantId: "t1", templateId: "research-agent" },
          ack: ackB
        }
      ]
    } as unknown as MessageBatch<RunQueueMessage>;

    await processRunBatch(batch, {
      process: vi.fn(async () => {})
    });

    expect(ackA).toHaveBeenCalledTimes(1);
    expect(ackB).toHaveBeenCalledTimes(1);
  });
});
