# Runbook: Durable Object Hot-Key Contention

## Scope
This runbook covers high contention on Durable Object keys used for agent session coordination.

## Symptoms
- Increased latency for specific tenant/template combinations.
- Backlog growth even with healthy queue consumers.
- Single Durable Object instance receives disproportionate traffic.

## Detection
- Track per-key request rate and p95/p99 latency.
- Alert when one key exceeds expected traffic share.
- Alert when DO response time breaches run orchestration SLO.

## Immediate Triage
1. Identify hot key pattern (`tenant_id:template_id`).
2. Verify whether load spike is legitimate or abuse.
3. Check if key-space cardinality is lower than expected.

## Containment
1. Apply temporary intake throttling for the affected tenant/template.
2. Shift low-priority runs to delayed processing window.
3. Enable queue backoff for non-urgent workloads.

## Recovery Procedure
1. Introduce sharding suffix strategy for hot key path.
2. Re-route new requests to shard-aware key generator.
3. Drain old-key backlog before disabling legacy route.
4. Validate stable latency and error rates after migration.

## Engineering Follow-ups
- Add key distribution telemetry in orchestrator.
- Add load test focused on key skew scenarios.
- Document sharding strategy and rollback process.
