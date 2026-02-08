# OpenClaw AaaS Web

Landing page and waitlist intake for managed OpenClaw agents.

## Run locally

```bash
npm install
npm run dev:web
```

## Notes

- Waitlist submissions are written to `apps/web/data/waitlist.jsonl`.
- Replace `lib/analytics.ts` with your provider integration (PostHog, Plausible, etc.).
- Frontend proxies Worker API through `pages/api/control/*`.
- Optional env vars:
  - `WORKER_API_BASE_URL` (server-side proxy target)
  - `NEXT_PUBLIC_STRIPE_STARTER_URL` (Starter checkout URL for signup redirect)
