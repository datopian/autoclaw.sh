# Memory Feature Review (Claude)

Date: 2026-02-20
Reviewer model: Claude Sonnet

## Product-value review summary

Top user outcomes:
- Remembers preferences without repetition.
- Recalls relevant older context.
- Learns projects/people organically.
- Avoids unsafe/irrelevant sensitive recall.
- Becomes better at user workflows over time.

Top product risks:
- Stale recall erodes trust.
- Creepy over-recall in wrong context.
- Silent forgetting.
- No correction/delete controls.
- Black-box memory behavior.

MVP guidance:
- Prioritize visibility/control UX and clear memory feedback.
- Do not overinvest in complex infra before trust UX.

## Technical review summary

Major gaps in current implementation:
- Queue only advances ordering watermark; no chunk/embed/index path.
- No semantic retrieval in prompt assembly path.
- No retention/compaction jobs.
- No telemetry for recall quality/latency/failures.

Recommended next execution slices:
1. Retrieval quality slice: usable memory retrieval in prompt path, bounded by budget.
2. Ingest/index slice: chunk + embed + vector metadata writes with idempotency.
3. Operational slice: retention, compaction, and telemetry.
4. UX/control slice: view/delete/override memory facts.
