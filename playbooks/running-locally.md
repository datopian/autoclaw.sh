---
title: Running OpenClaw Locally
description: Set up a full OpenClaw development environment on your machine using Docker and Wrangler's local simulation.
---

# Running OpenClaw Locally

For development and evaluation, OpenClaw runs fully locally using Wrangler's local mode (which simulates D1, R2, and Queues) and Docker Compose for supporting services. No Cloudflare account needed to get started.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Wrangler CLI: `npm install -g wrangler`

## 1. Clone and install

```bash
npm create openclaw@latest my-agent
cd my-agent
npm install
```

> **Multi-tenant setup?** If you're using the openclaw-aaas example instead, clone that repo and `cd` into `examples/openclaw-aaas` before continuing.

## 2. Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `.env.local`:

```env
WORKER_API_BASE_URL=http://localhost:8787
```

## 3. Start local infrastructure

```bash
docker compose up -d
```

This starts a local MinIO instance (R2 equivalent) and any other supporting services.

## 4. Start the worker in local mode

Wrangler's local mode simulates D1, R2, and Queues without hitting Cloudflare:

```bash
cd apps/worker-api
npm install
wrangler dev --local
```

The worker starts at `http://localhost:8787`. Local state (D1 data, R2 objects) persists in `.wrangler/state/`.

## 5. Set local secrets

```bash
echo "YOUR_ANTHROPIC_API_KEY" | wrangler secret put ANTHROPIC_API_KEY --local
echo "dev-secret" | wrangler secret put WORKER_AUTH_SECRET --local
```

## 6. Start the web app

```bash
cd apps/web
npm run dev
```

Opens at `http://localhost:3000`.

## Local vs production differences

| Feature | Local | Production |
|---|---|---|
| D1 database | SQLite file in `.wrangler/state/` | Cloudflare-managed D1 |
| R2 storage | MinIO via Docker | Cloudflare R2 |
| Queues | In-process simulation | Cloudflare Queues |
| AI Gateway | Direct API calls | Cloudflare AI Gateway |

## Resetting local state

```bash
rm -rf apps/worker-api/.wrangler/state
docker compose down -v && docker compose up -d
```

## Common issues

**Worker fails to start with `Missing binding`** — check that `.wrangler/state/` exists and that `wrangler dev --local` is used (not just `wrangler dev`, which tries to connect to Cloudflare).

**Queue messages not processing locally** — Wrangler's local queue simulation is synchronous; messages process immediately rather than via a consumer loop.
