# Runbook: Queue Failures

## Scope
This runbook covers failures in Cloudflare Queue processing for agent run jobs.

## Symptoms
- Rising queue backlog with delayed run completion.
- High run failure rate with status stuck in `queued` or `running`.
- Worker logs show repeated consumer exceptions.

## Detection
- Alert on queue backlog threshold breach.
- Alert on `failed` run status ratio over rolling 15 minutes.
- Alert on repeated identical error signatures in consumer logs.

## Immediate Triage
1. Confirm current queue depth and consumer health in Cloudflare dashboard.
2. Inspect recent consumer logs for first error class.
3. Check D1 write health and Durable Object response rates.
4. Validate external dependency health (AI Gateway/provider paths).

## Containment
1. If errors are deterministic, pause new run intake at API layer.
2. Keep queue consumer active for retry-safe jobs only.
3. Route new customer traffic to degraded mode banner in dashboard.

## Recovery Procedure
1. Deploy fix for root cause.
2. Replay affected queue messages in controlled batches.
3. Verify run status transitions to `succeeded` for replayed sample.
4. Resume normal intake after error-rate threshold returns to baseline.

## Data Consistency Checks
- Ensure no run remains `running` beyond max execution SLO.
- Reconcile queue-delivered run IDs with D1 run records.
- For orphaned runs, mark as `failed` with remediation note.

## Post-Incident Actions
- Add regression tests for the triggering failure mode.
- Update run orchestrator retry policy if needed.
- Publish incident summary with timeline and corrective actions.
