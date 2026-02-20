import { requireDb } from "../db/client";
import { createMemoryRepository } from "../db/repositories/memory";
import type { Env } from "../types";

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_BATCH_SIZE = 200;

function parseRetentionDays(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RETENTION_DAYS;
  }
  return Math.floor(parsed);
}

function buildDistillationKey(tenantId: string, now: Date): string {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `tenant/${tenantId}/memory/distilled/${yyyy}/${mm}/snapshot-${now.toISOString()}.md`;
}

function buildTelemetryKey(now: Date): string {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  return `ops/memory/telemetry/${yyyy}/${mm}/${dd}/${hh}.json`;
}

export async function runMemoryMaintenance(env: Env): Promise<void> {
  const db = requireDb(env);
  const memory = createMemoryRepository(db);
  await runMemoryMaintenanceWithDeps({
    env,
    memory
  });
}

export async function runMemoryMaintenanceWithDeps(input: {
  env: Pick<Env, "ARTIFACTS" | "MEMORY_RETENTION_DAYS">;
  memory: {
    listExpiredChunks: (cutoffIso: string, limit?: number) => Promise<
      Array<{ id: string; tenantId: string; r2Key: string }>
    >;
    deleteVectorsByChunkIds: (chunkIds: string[]) => Promise<void>;
    deleteChunksByIds: (chunkIds: string[]) => Promise<void>;
    listExpiredEventsWithoutChunks: (cutoffIso: string, limit?: number) => Promise<
      Array<{ id: string; contentR2Key: string }>
    >;
    deleteEventsByIds: (eventIds: string[]) => Promise<void>;
    listTenantsForMaintenance: (limit?: number) => Promise<string[]>;
    getWatermark: (tenantId: string) => Promise<{
      tenantId: string;
      lastIngestedSeq: number;
      lastDistilledSeq: number;
      updatedAt: string;
    }>;
    listProfiles: (tenantId: string, limit?: number) => Promise<
      Array<{ factKey: string; valueJson: string }>
    >;
    countTenantMemoryStats: (tenantId: string) => Promise<{
      eventCount: number;
      chunkCount: number;
      vectorCount: number;
      profileCount: number;
    }>;
    createDistillation: (input: {
      tenantId: string;
      scope: string;
      r2Key: string;
      qualityScore?: number | null;
      seqFrom?: number | null;
      seqTo?: number | null;
    }) => Promise<void>;
    markDistilledSeq: (tenantId: string, seq: number) => Promise<void>;
  };
}): Promise<void> {
  const { env, memory } = input;
  const now = new Date();
  const retentionDays = parseRetentionDays(env.MEMORY_RETENTION_DAYS);
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  let deletedChunks = 0;
  let deletedEvents = 0;
  for (;;) {
    const chunks = await memory.listExpiredChunks(cutoff, DEFAULT_BATCH_SIZE);
    if (chunks.length === 0) {
      break;
    }
    const chunkIds = chunks.map((chunk) => chunk.id);
    await memory.deleteVectorsByChunkIds(chunkIds);
    await memory.deleteChunksByIds(chunkIds);
    deletedChunks += chunkIds.length;
    await Promise.all(chunks.map((chunk) => env.ARTIFACTS.delete(chunk.r2Key)));
    if (chunks.length < DEFAULT_BATCH_SIZE) {
      break;
    }
  }

  for (;;) {
    const events = await memory.listExpiredEventsWithoutChunks(cutoff, DEFAULT_BATCH_SIZE);
    if (events.length === 0) {
      break;
    }
    const eventIds = events.map((event) => event.id);
    await memory.deleteEventsByIds(eventIds);
    deletedEvents += eventIds.length;
    await Promise.all(events.map((event) => env.ARTIFACTS.delete(event.contentR2Key)));
    if (events.length < DEFAULT_BATCH_SIZE) {
      break;
    }
  }

  const tenants = await memory.listTenantsForMaintenance();
  const telemetry: Array<Record<string, unknown>> = [];
  for (const tenantId of tenants) {
    const watermark = await memory.getWatermark(tenantId);
    const profiles = await memory.listProfiles(tenantId, 20);
    const stats = await memory.countTenantMemoryStats(tenantId);

    if (watermark.lastIngestedSeq > watermark.lastDistilledSeq && profiles.length > 0) {
      const markdown = [
        "# Memory Snapshot",
        "",
        `Tenant: ${tenantId}`,
        `Generated: ${now.toISOString()}`,
        "",
        "## Profile Facts",
        ...profiles.map((profile) => `- ${profile.factKey}: ${profile.valueJson}`)
      ].join("\n");
      const snapshotKey = buildDistillationKey(tenantId, now);
      await env.ARTIFACTS.put(snapshotKey, markdown, {
        httpMetadata: { contentType: "text/markdown; charset=utf-8" }
      });
      await memory.createDistillation({
        tenantId,
        scope: "profiles",
        r2Key: snapshotKey,
        seqFrom: watermark.lastDistilledSeq + 1,
        seqTo: watermark.lastIngestedSeq,
        qualityScore: 0.6
      });
      await memory.markDistilledSeq(tenantId, watermark.lastIngestedSeq);
    }

    telemetry.push({
      tenantId,
      watermark,
      stats
    });
  }

  const telemetryPayload = {
    generatedAt: now.toISOString(),
    retentionDays,
    cutoff,
    deletedChunks,
    deletedEvents,
    tenants: telemetry
  };
  await env.ARTIFACTS.put(buildTelemetryKey(now), JSON.stringify(telemetryPayload, null, 2), {
    httpMetadata: { contentType: "application/json" }
  });
}
