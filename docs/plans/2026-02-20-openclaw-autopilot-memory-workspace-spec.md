# OpenClaw Autopilot: Personalized Workspace + Memory Spec

Date: 2026-02-20
Status: Draft for implementation
Review: Claude review completed and approved (post-revision)

## 1. Objective

Implement tenant-personalized agent workspaces and memory so each user has:

- persistent behavior over time,
- configurable system prompt + skills,
- retrieval-augmented memory,
- optional QMD-style distillation in a later phase.

This spec maps the feature to the current Cloudflare stack (Workers + D1 + R2 + Queues + Durable Objects + AI Gateway).

## 2. Scope

In scope:

- Per-tenant workspace storage model.
- Multi-layer memory model (short-term, vector, profile).
- Cloudflare-native ingestion/retrieval pipeline.
- Migration + rollout plan with rollback safety.
- Reliability and security controls.

Out of scope (for this spec):

- Full dashboard UX for memory management.
- Cross-tenant shared memory.
- Provider-specific fine-tuning.

## 3. Architecture Mapping

- Worker API (`apps/worker-api`): routing, auth, orchestration.
- D1 (`DB`): metadata, memory indexes/pointers, profile facts, sequence watermarks.
- R2 (`ARTIFACTS`): raw events, workspace files, distilled snapshots.
- Queue (`MEMORY_INGEST_QUEUE`): async chunk embedding and vector upsert.
- Queue (`MEMORY_DISTILL_QUEUE`): async QMD distillation pipeline (Phase 3).
- Durable Object (`AGENT_SESSION`): request-time context assembler + short-lived cache/coordinator.
- Vector index (Cloudflare Vectorize or equivalent): semantic retrieval.

## 4. Workspace Layout

R2 key layout:

- `tenant/{tenant_id}/prompts/system.md`
- `tenant/{tenant_id}/skills/{skill_id}.md` (or `.json`)
- `tenant/{tenant_id}/memory/raw/{yyyy}/{mm}/{event_id}.json`
- `tenant/{tenant_id}/memory/distilled/{yyyy}/{mm}/{snapshot_id}.md`
- `tenant/{tenant_id}/artifacts/{run_id}/...`

Design note:

- R2 is eventually consistent; latest hot files are cache-through in DO for 60s read-after-write behavior.

## 5. Memory Model

### 5.1 Layers

1. Short-term memory:
- Recent turns + working set in DO cache.
- Idle hibernation after 5 minutes.

2. Long-term semantic memory:
- Chunked events in R2 + metadata in D1.
- Embeddings in vector index.

3. Structured profile memory:
- Stable user facts/preferences in D1 (`memory_profiles`).

### 5.2 Memory Modes

Per workspace `memory_mode`:

- `vector` (Phase 1)
- `hybrid` (Phase 2)
- `qmd` (Phase 3, optional)

## 6. D1 Data Model

Planned tables:

- `agent_workspaces`
  - `id`, `tenant_id`, `memory_mode`, `created_at`, `updated_at`
- `agent_prompts`
  - `workspace_id`, `system_prompt_r2_key`, `version`, `updated_at`
- `agent_skills`
  - `id`, `workspace_id`, `name`, `kind`, `r2_key`, `enabled`, `updated_at`
- `memory_events`
  - `id`, `tenant_id`, `session_id`, `role`, `content_r2_key`, `seq`, `created_at`
- `memory_chunks`
  - `id`, `tenant_id`, `event_id`, `r2_key`, `token_count`, `created_at`
- `memory_vectors`
  - `chunk_id`, `tenant_id`, `vector_id`, `embedding_model`, `status`, `updated_at`
- `memory_profiles`
  - `id`, `tenant_id`, `fact_key`, `value_json`, `confidence`, `version`, `updated_at`
- `memory_distillations`
  - `id`, `tenant_id`, `scope`, `r2_key`, `quality_score`, `seq_from`, `seq_to`, `created_at`
- `memory_seq_watermarks`
  - `tenant_id`, `last_ingested_seq`, `last_distilled_seq`, `updated_at`

## 7. Request-Time Flow

1. Receive inbound message (Telegram/web).
2. Redact sensitive values at ingress (before logging or enqueue).
3. Resolve workspace config (`prompt`, `skills`, `memory_mode`).
4. Compose context:
   - short-term from DO cache,
   - top-K vector retrieval,
   - relevant `memory_profiles`,
   - distilled snapshot if mode supports it.
5. Build token-budgeted prompt pack and call model.
6. Persist event to R2 + D1 with monotonic `seq`.
7. Enqueue ingestion job to `MEMORY_INGEST_QUEUE`.
8. Optionally enqueue distillation in later phases.

Fallback behavior:

- If vector retrieval breaches latency budget, continue with short-term + profile memory only.

## 8. Async Pipeline Controls

### 8.1 Ordering

- Queue messages include `tenant_id`, `seq`, `event_time`.
- Consumers validate against `memory_seq_watermarks`.
- Out-of-order events are buffered/requeued.

### 8.2 Concurrency

- Tenant write coordination via DO key `tenant:{id}:memory-write`.
- Optimistic version checks on mutable profile/distillation pointers.

### 8.3 Failure handling

- Exponential backoff + capped retries.
- Dead-letter queue for poison events.
- Circuit breaker around AI Gateway/provider failures.

## 9. Retention, Limits, and Cost Controls

- Default retention: 90 days for raw memory events/chunks.
- Nightly compaction into distilled snapshots.
- Archive old raw events to R2 JSONL.
- Per-tenant quota controls (events, vectors, R2 bytes).
- Backpressure when quota exceeds configured thresholds.

## 10. Security Requirements

- Strict tenant scoping in D1, vector queries, and R2 paths.
- Redaction at ingress before any logs.
- Never store raw secrets in memory tables.
- Delete/forget APIs:
  - remove single event,
  - purge session range,
  - full tenant memory wipe.

## 11. Migration Strategy

- Versioned D1 migrations.
- Dual-read, single-write transition where required.
- Feature flags:
  - `memory.workspace.enabled`
  - `memory.vector.enabled`
  - `memory.hybrid.enabled`
  - `memory.qmd.enabled`
- Rollback:
  - disable feature flags,
  - keep old execution path active,
  - preserve data for replay after fix.

## 12. Rollout Plan

### Phase 1: Workspace + Vector MVP

- Add workspace tables + migrations.
- Prompt/skills stored in R2 and resolved per tenant.
- Memory events/chunks ingest + vector retrieval.
- Retention baseline + quotas + DLQ.

Exit criteria:

- Stable p95 retrieval latency target met.
- No cross-tenant leakage in tests.
- Replay-safe ordering with sequence watermarks.

### Phase 2: Hybrid Retrieval + Policy + Observability

- Merge vector + profile + short-term scoring.
- Add memory telemetry:
  - retrieval hit rate,
  - latency,
  - context token contribution by memory source.
- Add memory policy controls (retention, size limits).

### Phase 3: QMD Distillation

- Add `MEMORY_DISTILL_QUEUE`.
- Distillation snapshots + retrieval merge with vector layer.
- Promote `memory_mode = qmd|hybrid` once vector SLOs remain stable.

## 13. Implementation Tasks (Initial)

1. Add D1 migrations for workspace/memory tables.
2. Add repository layer for workspace + memory metadata.
3. Add R2 workspace file helpers (prompts/skills/raw events/distilled).
4. Add queue producers/consumers for ingest path.
5. Add vector adapter interface and initial provider implementation.
6. Integrate retrieval composition into Telegram request path.
7. Add retention/compaction scheduled job.
8. Add tests for tenant isolation, ordering, and retries.

## 14. Open Questions

- Final vector backend choice and index schema details.
- Whether profile extraction is rule-based first or model-based from day one.
- Preferred QMD integration contract from upstream OpenClaw components.
- Target SLOs for retrieval latency and memory freshness per tier.
