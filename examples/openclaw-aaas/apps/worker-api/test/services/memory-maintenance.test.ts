import { describe, expect, it } from "vitest";
import { runMemoryMaintenanceWithDeps } from "../../src/services/memory-maintenance";

describe("memory maintenance", () => {
  it("cleans expired records, creates snapshot, and emits telemetry", async () => {
    const deletedR2: string[] = [];
    const putR2: string[] = [];
    const deletedChunkIds: string[][] = [];
    const deletedEventIds: string[][] = [];
    const createdDistillations: Array<{ tenantId: string; r2Key: string }> = [];
    const markedDistilled: Array<{ tenantId: string; seq: number }> = [];

    let chunkBatches = 0;
    let eventBatches = 0;
    await runMemoryMaintenanceWithDeps({
      env: {
        MEMORY_RETENTION_DAYS: "30",
        ARTIFACTS: {
          async delete(key: string) {
            deletedR2.push(key);
          },
          async put(key: string) {
            putR2.push(key);
            return null;
          }
        } as unknown as R2Bucket
      },
      memory: {
        async listExpiredChunks() {
          if (chunkBatches > 0) {
            return [];
          }
          chunkBatches += 1;
          return [
            { id: "chunk-1", tenantId: "t_1", r2Key: "tenant/t_1/memory/chunks/a.json" }
          ];
        },
        async deleteVectorsByChunkIds(chunkIds: string[]) {
          deletedChunkIds.push(chunkIds);
        },
        async deleteChunksByIds() {
          return;
        },
        async listExpiredEventsWithoutChunks() {
          if (eventBatches > 0) {
            return [];
          }
          eventBatches += 1;
          return [{ id: "event-1", contentR2Key: "tenant/t_1/memory/raw/a.json" }];
        },
        async deleteEventsByIds(eventIds: string[]) {
          deletedEventIds.push(eventIds);
        },
        async listTenantsForMaintenance() {
          return ["t_1"];
        },
        async getWatermark() {
          return {
            tenantId: "t_1",
            lastIngestedSeq: 5,
            lastDistilledSeq: 2,
            updatedAt: new Date().toISOString()
          };
        },
        async listProfiles() {
          return [{ factKey: "timezone", valueJson: "\"UTC\"" }];
        },
        async countTenantMemoryStats() {
          return {
            eventCount: 1,
            chunkCount: 1,
            vectorCount: 1,
            profileCount: 1
          };
        },
        async createDistillation(input) {
          createdDistillations.push({ tenantId: input.tenantId, r2Key: input.r2Key });
        },
        async markDistilledSeq(tenantId: string, seq: number) {
          markedDistilled.push({ tenantId, seq });
        }
      }
    });

    expect(deletedChunkIds).toEqual([["chunk-1"]]);
    expect(deletedEventIds).toEqual([["event-1"]]);
    expect(deletedR2).toContain("tenant/t_1/memory/chunks/a.json");
    expect(deletedR2).toContain("tenant/t_1/memory/raw/a.json");
    expect(createdDistillations.length).toBe(1);
    expect(markedDistilled).toEqual([{ tenantId: "t_1", seq: 5 }]);
    expect(putR2.some((key) => key.includes("/memory/distilled/"))).toBe(true);
    expect(putR2.some((key) => key.startsWith("ops/memory/telemetry/"))).toBe(true);
  });
});
