# OpenClaw Worker API

Cloudflare Worker control plane for tenants, templates, run requests, and billing webhooks.

## Local development

```bash
npm install
npm run dev -w apps/worker-api
```

## Required Cloudflare values for deploy

- `account_id` (Wrangler auth context)
- D1 `database_id`
- Queue name(s)
- R2 bucket name
- Durable Object migration state
- `CF_ACCOUNT_ID` and `AI_GATEWAY_ID` vars
- Secret: `STRIPE_WEBHOOK_SECRET`

## Current status

- Route skeleton is implemented.
- Queue consumer invokes run orchestrator and updates run status via D1.
- Durable Object `AgentSession` coordinates per-agent execution calls.
- Stripe webhook verification is placeholder-only and must be replaced with real signature verification.
