---
title: Hosting Options for OpenClaw
description: Compare deployment options for running OpenClaw — from local machine to cloud servers — with costs, pros/cons, and technical requirements.
---

# Hosting Options for OpenClaw

OpenClaw can run almost anywhere: your laptop, a cheap VPS, a serverless platform, or a home server. This playbook compares the most common options so you can pick the right fit for your use case.

## Quick comparison

| Option | Expertise | Monthly cost | Best for |
|---|---|---|---|
| Local machine | Beginner | $0 | Evaluation, personal use |
| VPS (Hetzner, DigitalOcean) | Intermediate | $4–10 | Most self-hosters |
| Cloudflare Workers | Intermediate–Advanced | $5+ | Production, multi-user |
| PaaS (Railway, Render, Fly.io) | Beginner–Intermediate | $5–20 | Fast setup, low ops overhead |
| Home server / Raspberry Pi | Advanced | $0–5 (electricity) | Privacy-first, always-on local |

---

## Local machine

Run OpenClaw directly on your computer. No server needed.

**Pros**
- Zero cost
- No configuration — clone and run
- Fully private, nothing leaves your machine

**Cons**
- Only available when your machine is on
- Not accessible from other devices without extra setup (e.g. ngrok tunnel)
- Limited by your machine's memory and CPU

**Technical requirements**
- Node.js 20+ or Docker
- Basic terminal comfort

**Cost:** $0

---

## VPS (Hetzner, DigitalOcean, Linode, Vultr)

Rent a small cloud server and run OpenClaw on it persistently. This is the most common choice for self-hosters who want always-on availability without managing complex infrastructure.

Hetzner is the best value — a CAX11 (2 vCPU ARM, 4 GB RAM) runs ~€4/month and handles OpenClaw comfortably.

**Pros**
- Always on, accessible from anywhere
- Full control over the environment
- Cheap — $4–10/month covers most use cases
- Easy to snapshot and migrate

**Cons**
- You manage OS updates, security patches, and backups
- Requires SSH/Linux comfort
- No automatic scaling

**Technical requirements**
- SSH and basic Linux commands
- Familiarity with systemd or Docker for process management
- (Optional) a domain and basic DNS knowledge for a clean URL

**Cost:** $4–10/month

---

## Cloudflare Workers

Run OpenClaw on Cloudflare's serverless edge network using the AutoClaw reference stack. Workers handle agent execution, D1 provides durable storage, Queues manage async tasks, and R2 stores artifacts.

See [Deploying OpenClaw on Cloudflare](./deploying-on-cloudflare.md) for a step-by-step guide.

**Pros**
- Globally distributed — low latency anywhere
- Scales to zero (no idle cost)
- No server to manage
- Tight integration with Cloudflare D1, R2, Queues, and AI Gateway

**Cons**
- Workers Paid plan required for D1 and Queues ($5/month)
- Workers have CPU time limits (50ms unbound per request on free, more on paid) — not suited for long-running synchronous tasks
- Requires understanding of Wrangler and Cloudflare's deployment model
- Cold starts on infrequently-used workers

**Technical requirements**
- Comfortable with CLI tooling (Wrangler)
- Understanding of serverless concepts (stateless execution, bindings)
- Familiarity with async/queue patterns for longer agent tasks

**Cost:** $5/month (Workers Paid) + R2/D1 usage (typically <$1/month at small scale)

---

## PaaS — Railway, Render, Fly.io

Platform-as-a-service providers that handle servers, deployments, and databases for you. You push code or a Docker image and they run it.

**Pros**
- Git push deploys — very low ops overhead
- Managed databases and environment variables
- Good developer experience
- Reasonable free tiers for low-traffic use

**Cons**
- Less control than a VPS
- More expensive at scale
- Vendor lock-in — moving away requires rework
- Free tiers often have sleep/idle limits that add latency

**Technical requirements**
- Basic familiarity with environment variables and deployment configs
- Docker knowledge helpful but not always required

**Cost:** $5–20/month depending on resources and provider

---

## Home server / Raspberry Pi

Run OpenClaw on hardware you own — a Raspberry Pi, an old laptop, or a mini PC at home.

**Pros**
- No ongoing hosting cost after hardware purchase
- Fully private — data never leaves your home network
- Full control

**Cons**
- Requires a stable home internet connection and ideally a static IP (or use Cloudflare Tunnel)
- Hardware failure = downtime
- More complex initial setup
- Power outages affect availability

**Technical requirements**
- Linux administration (comfortable with systemd, networking, firewall rules)
- Cloudflare Tunnel or similar if you want external access without exposing your home IP
- Some networking knowledge (port forwarding, DNS)

**Cost:** $0–5/month (electricity) after one-time hardware cost (~$50–80 for a Raspberry Pi 5)

---

## How to choose

**Just evaluating or using personally** → run locally, no setup overhead.

**Want always-on at low cost with minimal ops** → VPS on Hetzner. Best value for solo operators.

**Building for multiple users or need production reliability** → Cloudflare Workers with the AutoClaw stack.

**Want fast setup without thinking about servers** → Railway or Render.

**Privacy-first and technically comfortable** → home server with Cloudflare Tunnel.
