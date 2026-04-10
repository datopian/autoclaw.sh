---
title: "Building a Serverless SRE Agent on Cloudflare"
description: "How we built an autonomous SRE incident investigation agent using Cloudflare Workers, Durable Objects, and Gemma 4 — with no servers to manage."
date: 2026-04-10
---

> **Note:** This post is published on autoclaw.sh, which is primarily focused on OpenClaw — our open-source AI scraping framework. This project is separate: an SRE automation tool we built for our own infrastructure. We're sharing it here because it's a good example of what you can do with the Cloudflare stack, and several architectural patterns overlap with how we build OpenClaw tooling.

---

We run CKAN-based data portals on Google Kubernetes Engine for a number of clients. When something goes down at 2am, someone gets paged. They SSH into a bastion, run a dozen `kubectl` commands, piece together what happened, and write up a summary. It's repetitive, it's slow, and it's the kind of work that a well-prompted LLM with tool access can do reasonably well.

So we built an agent to do it.

## What it does

When Uptime Kuma detects a monitor going down, it fires a webhook to a Cloudflare Worker. The Worker:

1. Sends an immediate "received" notification to Google Chat
2. Queues the incident for investigation
3. Spins up a Durable Object that runs an autonomous investigation loop

The investigation loop calls Gemma 4 (via Cloudflare Workers AI) with a set of Kubernetes read-only tools: list pods, get deployment status, fetch recent events, check rollout history, get pod logs. The model decides which tools to call, interprets the results, and iterates — up to 20 tool calls — before producing a root cause assessment and a recommended remediation command.

All findings are posted to Google Chat as a threaded conversation, one thread per incident.

## The stack

Everything runs on Cloudflare with no dedicated servers:

- **Cloudflare Workers** — webhook intake, routing, queue consumer
- **Durable Objects** — per-incident stateful investigation loop, driven by alarms
- **Workers Queues** — deduplication and async dispatch
- **Workers KV** — deduplication store
- **Workers AI (Gemma 4)** — autonomous investigation, function calling
- **Google Chat** — threaded notifications

Kubernetes access goes through a DNS record (`gke-api.yourdomain.com`) pointing to the GKE master endpoint, proxied through Cloudflare with Full SSL mode. The Worker authenticates using a read-only ServiceAccount bearer token.

## What surprised us

**Gemma 4 supports tool calling natively on Workers AI.** We initially assumed we'd need to go through an external API (we briefly considered Moonshot/Kimi K2.5) but Gemma 4 is available directly through the Workers AI binding with full function-calling support. No external API key, billed through Cloudflare.

**The response format is OpenAI-compatible.** Cloudflare Workers AI returns responses in standard OpenAI chat completion format (`choices[0].message.tool_calls`), which made it straightforward to integrate.

**Cloudflare Tunnel is optional for GKE.** GKE's master endpoint is public by default — it just requires authentication. A simple DNS A record and a read-only ServiceAccount token is all you need. No `cloudflared`, no `kubectl proxy`, no in-cluster infrastructure.

**Threading in Google Chat is one query parameter.** Appending `?threadKey=<incidentId>&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD` to the webhook URL groups all messages for one incident into a single thread automatically.

## What it looks like in practice

A monitor goes down. Within 30 seconds, Google Chat shows one thread:

- *Alert received — starting investigation*
- *Step 3: list_pods(namespace=dx-helm-client-prod)*
- *Step 7: get_recent_events(namespace=dx-helm-client-prod)*
- Final card: root cause, recommended kubectl command, confidence level, duration

The on-call engineer reads one thread, runs one command, resolves the incident. Or ignores it if it's a transient blip — the agent concludes with confidence `low` and says so.

## What it doesn't do

It doesn't fix anything. It's read-only by design. Giving an autonomous agent write access to production infrastructure is a different conversation. For now, it's a very fast first responder that does the evidence gathering so the human doesn't have to.

## The code

The implementation is in our `sre_agent` repository. A full deployment playbook — including GKE RBAC setup, Cloudflare Worker configuration, and secrets management — is also available on this site.
