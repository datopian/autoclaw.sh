# OpenClaw

An open-source framework for deploying and operating AI agent systems.

OpenClaw is an early, opinionated prototype and reference implementation — not a finished platform. The goal is to develop reusable deployment patterns, operational tooling, and practical know-how for running agent systems in production.

## What this is

- A **framework and harness** for deploying AI agents on your own infrastructure
- A set of **reference examples** showing real deployment paths (Cloudflare, Hetzner, etc.)
- A growing collection of **playbooks** for setup, debugging, and stabilization
- An **open learning experiment** — we build in public and share what we find

## What this is not

- A managed SaaS product
- An abstraction that hides your infrastructure
- A finished or stable framework

## Repository structure

```
/
  README.md
  docs/              # Overview, architecture, framework docs
  examples/          # Reference deployments
    openclaw-aaas/   # Full AaaS reference: Next.js control plane + Cloudflare Worker API
  templates/         # Deployment harnesses and config scaffolds
  playbooks/         # Operational guides: setup, debugging, stabilization
```

## Examples

### [`examples/openclaw-aaas`](./examples/openclaw-aaas)

A full Agent-as-a-Service reference implementation running on Cloudflare:

- **`apps/web`** — Next.js control plane (auth, dashboard, billing, blog)
- **`apps/worker-api`** — Cloudflare Worker API (agent sessions, memory, queues, sandboxed runtime)

## Documentation

- [`docs/scqh/`](./docs/scqh/) — Strategic context (situation, complication, question, hypothesis)
- [`docs/plans/`](./docs/plans/) — Execution plans
- [`docs/drafts/`](./docs/drafts/) — Work in progress

## License

MIT — see [LICENSE](./LICENSE).
