---
title: Deploying AutoClaw on Cloudflare
description: End-to-end guide to deploying an AutoClaw agent system on Cloudflare Workers, D1, R2, and Queues.
---

# Deploying AutoClaw on Cloudflare

Cloudflare is the reference infrastructure for AutoClaw. Workers handle agent execution, D1 provides durable SQLite storage, Queues decouple run scheduling from execution, and R2 stores artifacts. This guide covers a full deployment from scratch.

## Prerequisites

- Cloudflare account with Workers Paid plan (required for D1 and Queues)
- `wrangler` CLI installed: `npm install -g wrangler`
- Authenticated: `wrangler login`

## 1. Clone the reference example

```bash
git clone https://github.com/datopian/autoclaw.sh
cd autoclaw.sh/examples/openclaw-aaas
```

## 2. Configure wrangler

Copy the template and fill in your account details:

```bash
cp apps/worker-api/wrangler.jsonc.example apps/worker-api/wrangler.jsonc
```

Edit `wrangler.jsonc` and replace the placeholders:

```jsonc
{
  "account_id": "YOUR_CLOUDFLARE_ACCOUNT_ID",   // from dash.cloudflare.com
  "ai": {
    "binding": "AI"
  }
}
```

Find your account ID in the Cloudflare dashboard under Workers & Pages.

## 3. Create D1 database

```bash
wrangler d1 create autoclaw-db
```

Copy the `database_id` from the output into your `wrangler.jsonc`:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "autoclaw-db", "database_id": "YOUR_DATABASE_ID" }
]
```

Run the migrations:

```bash
wrangler d1 migrations apply autoclaw-db
```

## 4. Create R2 bucket

```bash
wrangler r2 bucket create autoclaw-artifacts
```

## 5. Create Queues

```bash
wrangler queues create autoclaw-run-queue
wrangler queues create autoclaw-memory-queue
```

## 6. Set secrets

```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put WORKER_AUTH_SECRET   # any random string, used to auth internal calls
```

## 7. Deploy the worker

```bash
cd apps/worker-api
npm install
wrangler deploy
```

Note the deployed URL — something like `https://autoclaw-worker-api.YOUR_SUBDOMAIN.workers.dev`.

## 8. Deploy the web frontend

Set the worker URL as an environment variable and deploy (Cloudflare Pages or Vercel):

```bash
WORKER_API_BASE_URL=https://autoclaw-worker-api.YOUR_SUBDOMAIN.workers.dev
```

## Verifying the deployment

Hit the health endpoint:

```bash
curl https://autoclaw-worker-api.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response:

```json
{ "status": "ok", "db": "connected" }
```

## Common issues

**`Error: D1 database not found`** — the `database_id` in wrangler.jsonc doesn't match the created DB. Run `wrangler d1 list` to confirm the ID.

**`Error: Script startup exceeded CPU time limit`** — a dependency is too large. Check for packages importing Node.js built-ins; they don't run on Workers.

**Queue messages not processing** — confirm the queue consumer binding in wrangler.jsonc matches the queue name exactly.

## Next steps

- [Stabilizing a deployment](./stabilizing-a-deployment.md) — reduce failure rates and add observability
- [Secure / private deployments](./secure-private-deployment.md) — lock down your instance
