# AutoClaw

The open deployment reference for [OpenClaw](https://openclaw.ai) AI agents.

AutoClaw is Datopian's open-source project for deploying and operating OpenClaw in production. It is not a managed service or an abstraction layer — it is playbooks, reference implementations, and operational patterns, built in public and shared freely.

## What this repo contains

- **Playbooks** — step-by-step operational guides: deploying on Cloudflare, running locally, stabilizing in production, and more
- **Examples** — reference deployments showing real configurations (single-agent, multi-tenant AaaS, etc.)
- **Site** — the autoclaw.sh static site, built with Astro and deployed on Cloudflare Pages

## What AutoClaw is not

- A managed SaaS platform
- An abstraction that hides your infrastructure
- A finished or stable framework — it's an ongoing open experiment

## Repository structure

```
/
  README.md
  playbooks/         # Operational guides for deploying and running OpenClaw
  examples/
    openclaw-aaas/   # Multi-tenant OpenClaw AaaS: Next.js control plane + Cloudflare Worker API
  site/              # autoclaw.sh — Astro static site
  docs/              # Architecture, plans, research drafts
```

## Playbooks

Operational guides for running OpenClaw in production:

- [Deploying OpenClaw on Cloudflare](./playbooks/deploying-on-cloudflare.md)
- [How to Compare LLM Quality for Your OpenClaw Use Case](./playbooks/how-to-compare-llm-quality-for-your-openclaw-use-case/README.md)
- [Running OpenClaw Locally](./playbooks/running-locally.md)
- [Stabilizing an OpenClaw Deployment](./playbooks/stabilizing-a-deployment.md)

Published at [autoclaw.sh/playbooks](https://autoclaw.sh/playbooks).

## Examples

### [`examples/openclaw-aaas`](./examples/openclaw-aaas)

A multi-tenant OpenClaw Agent-as-a-Service reference implementation on Cloudflare:

- **`apps/web`** — Next.js control plane (auth, dashboard, billing)
- **`apps/worker-api`** — Cloudflare Worker API (agent sessions, memory, queues, sandboxed runtime)

## License

MIT — see [LICENSE](./LICENSE).
