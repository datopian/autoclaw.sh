import { describe, expect, it } from "vitest";
import {
  processMemoryIngestBatch,
  type MemoryIngestQueueMessage
} from "../../src/queues/memory-consumer";

type MockMessage = {
  body: MemoryIngestQueueMessage;
  acked: boolean;
  retried: boolean;
  ack: () => void;
  retry: () => void;
};

function makeMessage(body: MemoryIngestQueueMessage): MockMessage {
  return {
    body,
    acked: false,
    retried: false,
    ack() {
      this.acked = true;
    },
    retry() {
      this.retried = true;
    }
  };
}

describe("memory consumer", () => {
  it("acks duplicate sequences", async () => {
    const msg = makeMessage({
      tenantId: "t_1",
      eventId: "e_1",
      seq: 3,
      eventTime: new Date().toISOString()
    });

    await processMemoryIngestBatch(
      { messages: [msg] } as unknown as MessageBatch<MemoryIngestQueueMessage>,
      {
        async getWatermark() {
          return {
            tenantId: "t_1",
            lastIngestedSeq: 3,
            lastDistilledSeq: 0,
            updatedAt: new Date().toISOString()
          };
        },
        async markIngestedSeq() {
          return;
        }
      }
    );

    expect(msg.acked).toBe(true);
    expect(msg.retried).toBe(false);
  });

  it("retries out-of-order sequences", async () => {
    const msg = makeMessage({
      tenantId: "t_1",
      eventId: "e_3",
      seq: 5,
      eventTime: new Date().toISOString()
    });

    await processMemoryIngestBatch(
      { messages: [msg] } as unknown as MessageBatch<MemoryIngestQueueMessage>,
      {
        async getWatermark() {
          return {
            tenantId: "t_1",
            lastIngestedSeq: 3,
            lastDistilledSeq: 0,
            updatedAt: new Date().toISOString()
          };
        },
        async markIngestedSeq() {
          return;
        }
      }
    );

    expect(msg.acked).toBe(false);
    expect(msg.retried).toBe(true);
  });

  it("marks and acks next expected sequence", async () => {
    const msg = makeMessage({
      tenantId: "t_1",
      eventId: "e_2",
      seq: 4,
      eventTime: new Date().toISOString()
    });
    let marked = false;

    await processMemoryIngestBatch(
      { messages: [msg] } as unknown as MessageBatch<MemoryIngestQueueMessage>,
      {
        async getWatermark() {
          return {
            tenantId: "t_1",
            lastIngestedSeq: 3,
            lastDistilledSeq: 0,
            updatedAt: new Date().toISOString()
          };
        },
        async markIngestedSeq(tenantId: string, seq: number) {
          marked = tenantId === "t_1" && seq === 4;
        }
      }
    );

    expect(marked).toBe(true);
    expect(msg.acked).toBe(true);
    expect(msg.retried).toBe(false);
  });
});
