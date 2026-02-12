# OpenClaw AaaS

Managed service for running template-based OpenClaw agents with:
- tenant onboarding
- queued run orchestration
- BYOK model execution via Cloudflare AI Gateway
- subscription-gated access using Stripe webhooks

This repository is a monorepo with a web control plane and a Cloudflare Worker API.

## Product Overview

`OpenClaw AaaS` is designed for teams that want to ship agent workflows without building platform infrastructure first.

Core idea:
- Customer creates a tenant.
- Customer selects an agent template.
- Customer launches a run (optionally with BYOK model key).
- Backend validates subscription, queues execution, updates run lifecycle, and coordinates agent execution.

## Repository Layout

- `apps/web`: Next.js UI (landing, signup, dashboard, API proxy routes)
- `apps/worker-api`: Cloudflare Worker backend (tenants, templates, runs, subscriptions, queue consumer)
- `docs/security`: BYOK and baseline security policies
- `docs/runbooks`: operational runbooks
- `docs/plans`: implementation plans and architecture notes

## Architecture

Frontend (`apps/web`):
- Serves UI pages.
- Proxies backend calls through `pages/api/control/*`.
- Uses `WORKER_API_BASE_URL` server-side to reach Worker API.

Backend (`apps/worker-api`):
- `fetch` routes:
- `/healthz`
- `/api/tenants`
- `/api/templates`
- `/api/runs`
- `/api/webhooks/stripe`
- `/api/subscriptions`
- `queue` consumer processes run messages and updates D1 run status.
- Durable Object `AgentSession` coordinates per-agent execution sessions.
- Storage/bindings: D1 (`DB`), R2 (`ARTIFACTS`), Queue (`RUN_QUEUE`), Durable Object (`AGENT_SESSION`).

## Request Flow (Happy Path)

1. UI posts `POST /api/control/runs`.
2. Next.js API route proxies to Worker `POST /api/runs`.
3. Worker checks tenant subscription status.
4. Worker writes queued run in D1 and enqueues run payload.
5. Queue consumer marks run running, optionally calls AI Gateway using BYOK key, invokes `AgentSession`, then marks run succeeded/failed.

## Prerequisites

- Node.js 22.x (tested with v22.22.0)
- npm 9+
- Cloudflare account for Worker development/deploy
- Wrangler CLI (installed via workspace dependencies)

## Getting Started (Developers)

### 1. Install dependencies

```bash
npm install
```

### 2. Run web UI locally

```bash
npm run dev:web
```

Open `http://localhost:3000`.

Optional web env vars:
- `WORKER_API_BASE_URL`: Worker API base URL used by server-side proxy routes.
- `NEXT_PUBLIC_STRIPE_STARTER_URL`: Starter checkout URL used by signup flow.

### 3. Run Worker API locally

```bash
npm run dev:worker
```

Wrangler config lives at `apps/worker-api/wrangler.jsonc`.

### 4. Run backend checks

```bash
npm run test:worker
npm run typecheck:worker
```

### 5. Build web app

```bash
npm run build:web
```

## If Backend Is Already Deployed

You can develop only the UI and point it to deployed backend:

1. Set `WORKER_API_BASE_URL` to deployed Worker URL.
2. Run `npm run dev:web`.
3. Use UI pages (`/signup`, `/dashboard`, `/pricing`) against live backend.

## Deployment Notes

Frontend:
- Deploy `apps/web` as a Next.js server app (for API routes), e.g. Vercel.
- Configure `WORKER_API_BASE_URL` in deployment env.

Backend:
- Deploy Worker from `apps/worker-api` with Wrangler:

```bash
npm run deploy -w apps/worker-api
```

- Ensure Cloudflare bindings and secrets are configured:
- D1 database
- R2 bucket
- Queue producer/consumer
- Durable Object migration
- `STRIPE_WEBHOOK_SECRET`
- `CF_ACCOUNT_ID`
- `AI_GATEWAY_ID`

## Security and BYOK

Policy docs:
- `docs/security/byok-policy.md`
- `docs/security/cloudflare-baseline.md`

Current policy intent:
- BYOK keys are customer-supplied and not persisted in D1.
- Keys are used for outbound model calls only.
- Redaction and operational hardening are required before GA.
