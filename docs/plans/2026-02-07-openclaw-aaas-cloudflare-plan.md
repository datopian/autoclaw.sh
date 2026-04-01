# OpenClaw AaaS Cloudflare-First Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch a Cloudflare-native Agent-as-a-Service for managed OpenClaw agents, starting with solo builders and BYOK model access.

**Architecture:** Use a Worker control plane with Queue-backed async runs, Durable Objects for per-agent coordination, D1 for product metadata, and R2 for artifacts. Follow Moltworker's pattern (Worker entrypoint + isolated runtime capability), but avoid inheriting proof-of-concept assumptions for multi-customer SaaS controls.

**Tech Stack:** Next.js landing/dashboard, Cloudflare Workers, Queues, Durable Objects, D1, R2, Workers AI Gateway (BYOK), Stripe, Sentry, Wrangler, GitHub Actions.

## What Moltworker Proves (Reference Baseline)
- OpenClaw can run on Cloudflare using a middleware Worker and adapted runtime scripts.
- Useful platform integrations: AI Gateway, R2 persistence, Browser Rendering hooks, and Access-protected admin surfaces.
- The implementation is explicitly presented as a proof of concept, not a managed SaaS product.

## V1 Product Scope
- ICP: solo builders first.
- Offer: DIY + managed infra.
- Model policy: BYOK only for v1.
- Agent setup: template-based (support/research/ops).
- Onboarding: waitlist + manual approvals + Stripe subscriptions.
- Isolation: logical multi-tenant in control plane; per-agent/session coordination in Durable Objects.

## Core Cloudflare Architecture

### 1) Control Plane Worker
- HTTP APIs: tenants, templates, entitlements, run requests.
- Auth: Cloudflare Access (operator surfaces) + app session auth.
- Billing integration: Stripe webhook route in Worker.

### 2) Agent Execution Pipeline
- Worker enqueues run jobs to Queues.
- Queue consumers execute short/medium tasks and checkpoint state.
- Durable Object per `tenant_id:agent_id` for sequencing, lock control, and session memory pointers.

### 3) Data Layer
- D1: tenants, plans, subscriptions, templates, run metadata, audit records.
- R2: artifacts, transcripts, debug bundles, optional exports.
- DO storage: ephemeral coordination/state hot-path.

### 4) Model Gateway
- AI Gateway endpoint for provider abstraction and observability.
- BYOK credentials stored via Worker secrets/secrets-store strategy.

### 5) Browser/Tooling Path
- Start without heavy browser automation in v1.
- Add Browser Rendering capability only for templates that require it.

## Key Differences vs Moltworker PoC
- Add strict tenant model, quota enforcement, billing entitlements, and operator audit trails.
- Add idempotent job semantics, retries, dead-letter handling, and incident runbooks.
- Add productized onboarding and support workflow instead of single-instance personal setup.

## 30/60/90 Day Sequence

### Day 0-30
1. Keep existing web waitlist surface and connect it to D1-backed intake.
2. Build Worker control plane skeleton (`/api/tenants`, `/api/templates`, `/api/runs`).
3. Add Stripe products + webhook processing for subscription state.
4. Implement first Queue consumer and DO coordinator for one template.
5. Wire AI Gateway BYOK flow.
6. Onboard first 3 design partners manually.

### Day 31-60
1. Add usage metering + plan quotas.
2. Add run timeline and retry visibility in dashboard.
3. Add R2 artifact storage and signed downloads.
4. Add incident runbooks and alerting.
5. Expand to 10-15 paid pilots.

### Day 61-90
1. Add guided self-serve onboarding.
2. Add template parameterization and safe defaults.
3. Add agency-friendly controls (multi-project views).
4. Prepare enterprise delta list (SSO, contractual controls, data residency options).

## Technical Backlog (Concrete Targets)

### Task 1: Web + Waitlist (already started)
**Files:**
- Existing: `apps/web/pages/index.tsx`
- Existing: `apps/web/pages/waitlist.tsx`
- Existing: `apps/web/pages/api/waitlist.ts`

### Task 2: Worker Control Plane
**Files:**
- Create: `apps/worker-api/wrangler.jsonc`
- Create: `apps/worker-api/src/index.ts`
- Create: `apps/worker-api/src/routes/tenants.ts`
- Create: `apps/worker-api/src/routes/templates.ts`
- Create: `apps/worker-api/src/routes/runs.ts`
- Create: `apps/worker-api/src/routes/webhooks/stripe.ts`

### Task 3: D1 Schema + Repository Layer
**Files:**
- Create: `apps/worker-api/migrations/0001_init.sql`
- Create: `apps/worker-api/src/db/client.ts`
- Create: `apps/worker-api/src/db/repositories/tenants.ts`
- Create: `apps/worker-api/src/db/repositories/runs.ts`

### Task 4: Queues + Durable Objects
**Files:**
- Create: `apps/worker-api/src/queues/run-consumer.ts`
- Create: `apps/worker-api/src/durable/agent-session.ts`
- Create: `apps/worker-api/src/services/run-orchestrator.ts`

### Task 5: AI Gateway + BYOK
**Files:**
- Create: `apps/worker-api/src/services/ai-gateway.ts`
- Create: `apps/worker-api/src/services/secrets.ts`
- Create: `docs/security/byok-policy.md`

### Task 6: Ops + Trust
**Files:**
- Create: `docs/runbooks/queue-failures.md`
- Create: `docs/runbooks/do-hotkey-contention.md`
- Create: `docs/security/cloudflare-baseline.md`

## Risk Register
- Risk: D1 throughput bottlenecks at growth stage.
- Mitigation: partitioning strategy + archival jobs + read caching.

- Risk: Durable Object hot-spotting on bad key design.
- Mitigation: shard key strategy and key cardinality SLO checks.

- Risk: Worker CPU/runtime limits for complex tasks.
- Mitigation: split into staged Queue jobs; reserve container path for heavy workloads.

- Risk: Product dependency on PoC assumptions.
- Mitigation: treat Moltworker as pattern reference only; define SaaS hardening checklist before GA.

## Immediate Next Actions
1. Build `apps/worker-api` skeleton with `wrangler.jsonc` bindings for D1/Queues/DO/R2.
2. Replace file-based waitlist persistence with D1 insertion path.
3. Implement one production-grade template pipeline end-to-end (request -> queue -> DO -> result).
