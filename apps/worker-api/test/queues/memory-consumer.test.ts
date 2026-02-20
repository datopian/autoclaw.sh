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
        memory: {
          async findEventById() {
            return null;
          },
          async listChunksByEvent() {
            return [];
          },
          async upsertChunk() {
            return;
          },
          async upsertVector() {
            return;
          },
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
        },
        artifacts: {
          async get() {
            return null;
          },
          async put() {
            return null;
          }
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
        memory: {
          async findEventById() {
            return null;
          },
          async listChunksByEvent() {
            return [];
          },
          async upsertChunk() {
            return;
          },
          async upsertVector() {
            return;
          },
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
        },
        artifacts: {
          async get() {
            return null;
          },
          async put() {
            return null;
          }
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

    let chunkWrites = 0;
    let vectorWrites = 0;
    let artifactWrites = 0;

    await processMemoryIngestBatch(
      { messages: [msg] } as unknown as MessageBatch<MemoryIngestQueueMessage>,
      {
        memory: {
          async findEventById() {
            return {
              id: "e_2",
              tenantId: "t_1",
              role: "user",
              contentR2Key: "tenant/t_1/memory/raw/2026/02/e_2.json",
              createdAt: new Date().toISOString()
            };
          },
          async listChunksByEvent() {
            return [];
          },
          async upsertChunk() {
            chunkWrites += 1;
          },
          async upsertVector() {
            vectorWrites += 1;
          },
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
        },
        artifacts: {
          async get() {
            return {
              text: async () =>
                JSON.stringify({
                  text: "Alpha Bravo Charlie Delta Echo Foxtrot"
                })
            } as unknown as R2ObjectBody;
          },
          async put() {
            artifactWrites += 1;
            return null;
          }
        }
      }
    );

    expect(marked).toBe(true);
    expect(msg.acked).toBe(true);
    expect(msg.retried).toBe(false);
    expect(chunkWrites).toBeGreaterThan(0);
    expect(vectorWrites).toBeGreaterThan(0);
    expect(artifactWrites).toBeGreaterThan(0);
  });
});
