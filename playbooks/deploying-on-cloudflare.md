---
title: Deploying OpenClaw on Cloudflare
description: End-to-end guide to deploying a single OpenClaw agent on Cloudflare Workers, D1, R2, and Queues.
---

# Deploying OpenClaw on Cloudflare

Cloudflare is a solid choice for running OpenClaw in production. Workers handle agent execution, D1 provides durable SQLite storage, Queues decouple run scheduling from execution, and R2 stores artifacts. This guide covers a straightforward single-agent deployment.

> **Looking for multi-tenant?** If you need to run OpenClaw as a service for multiple users, see the [openclaw-aaas example](https://github.com/datopian/autoclaw.sh/tree/main/examples/openclaw-aaas) — it adds user management, isolated agent contexts, and a full web UI.

## Prerequisites

- Cloudflare account with Workers Paid plan (required for D1 and Queues)
- `wrangler` CLI installed: `npm install -g wrangler`
- Authenticated: `wrangler login`
- An OpenClaw worker project (scaffold one with `npm create openclaw@latest`)

## 1. Configure wrangler

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
wrangler d1 create openclaw-db
```

Copy the `database_id` from the output into your `wrangler.jsonc`:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "openclaw-db", "database_id": "YOUR_DATABASE_ID" }
]
```

Run the migrations:

```bash
wrangler d1 migrations apply openclaw-db
```

## 4. Create R2 bucket

```bash
wrangler r2 bucket create openclaw-artifacts
```

## 5. Create Queues

```bash
wrangler queues create openclaw-run-queue
wrangler queues create openclaw-memory-queue
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

Note the deployed URL — something like `https://openclaw-worker-api.YOUR_SUBDOMAIN.workers.dev`.

## 8. Deploy the web frontend

Set the worker URL as an environment variable and deploy to Cloudflare Pages:

```bash
WORKER_API_BASE_URL=https://openclaw-worker-api.YOUR_SUBDOMAIN.workers.dev
```

## Verifying the deployment

Hit the health endpoint:

```bash
curl https://openclaw-worker-api.YOUR_SUBDOMAIN.workers.dev/health
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
