---
title: When to Use OpenClaw (and When Not To)
description: A decision framework for choosing between OpenClaw, a custom agent loop, Cloudflare Workers AI, or plain LLM API calls — based on what your task actually needs.
---

# When to Use OpenClaw (and When Not To)

OpenClaw is an agent framework. That means it's genuinely useful for some things and unnecessary overhead for others. This playbook helps you make the call.

---

## The core question

Before reaching for OpenClaw, answer this:

> **Does your task require a reasoning agent — something that plans, uses tools, and iterates based on results — or does it just need an LLM call?**

If the answer is "it needs an agent", the follow-up is:

> **Does the agent need to run persistently and respond to events, or is it triggered once and runs to completion?**

These two questions determine most of the decision.

---

## Quick decision table

| Scenario | Use OpenClaw? |
|---|---|
| Multi-turn autonomous investigation with tool use | **Yes** |
| Scraping + processing pipeline where agent decides next steps | **Yes** |
| Interactive user-facing assistant (chat, copilot) | **Yes** |
| Agent needs memory across sessions | **Yes** |
| You need to swap LLMs easily | **Yes** |
| Serverless event-driven processing (webhook → action) | **No — use CF Workers** |
| Single LLM call that returns structured output | **No — use API directly** |
| Tight integration with Cloudflare primitives (DO, Queues, KV) | **No — use CF Workers AI** |
| Simple classification or extraction | **No — use API directly** |
| Sub-second edge response required | **No — use CF Workers AI** |
| Hybrid: CF handles infra, agent handles reasoning | **Yes for the agent part** |

---

## Use OpenClaw when...

### 1. The task genuinely requires an agent

An agent is not just "calling an LLM". It's an LLM that decides what to do next, acts on that decision, observes the result, and iterates. If your task doesn't have that loop, you don't need an agent framework.

Signs you need an agent:
- The number of steps is not known upfront
- The next action depends on the result of the previous one
- The task involves multiple tools that need to be orchestrated
- You need the model to reason about evidence before concluding

Signs you don't:
- You have a fixed prompt and want a structured JSON response
- You're classifying, summarising, or extracting from known input
- One LLM call is enough

### 2. You're iterating on agent behaviour

OpenClaw gives you an abstraction layer between your agent logic and the LLM calls underneath. Changing how the agent reasons, adding a planning step, injecting memory, or adding reflection — these are fast to iterate when they're handled by a framework rather than hand-rolled code.

If `loop.ts` in your project is growing beyond 200 lines of turn management, tool dispatch, and conversation history plumbing, you're building OpenClaw badly. Use the real thing.

### 3. The agent needs memory across sessions

A single incident investigation doesn't need cross-session memory. A support agent that learns from past interactions, a scraping agent that tracks what it's already visited, or a planning agent that accumulates knowledge over time — these do. OpenClaw is designed for persistent memory; a custom loop is not.

### 4. You need multi-model flexibility

If you want to route different task types to different models (e.g. fast cheap model for tool selection, larger model for final synthesis), or swap providers as costs and capabilities change, a framework that abstracts over providers is worth it. Hard-coding model calls makes this painful later.

### 5. The agent is user-facing

When a human is waiting for the agent to respond — in a chat interface, a copilot, a workflow tool — agent quality matters more than infrastructure simplicity. OpenClaw's higher-level abstractions tend to produce better agent behaviour out of the box than hand-rolled alternatives, because the hard parts (handling malformed tool calls, managing context overflow, structuring the reasoning trace) are already worked out.

---

## Don't use OpenClaw when...

### 1. You need serverless / edge deployment

OpenClaw needs a runtime — Node.js on a server or container. It is not deployable as a Cloudflare Worker in the traditional sense. If your requirement is:

- Zero cold starts
- Global edge distribution
- Respond within milliseconds of a webhook
- No infrastructure to manage

...then Cloudflare Workers is the right layer. You can call out to an OpenClaw instance from a Worker if needed, but don't try to run OpenClaw inside a Worker.

### 2. You need tight integration with Cloudflare primitives

Durable Objects, Queues, KV, R2, Workers AI — these are Cloudflare-native primitives that Workers integrate with seamlessly. If your architecture depends on:

- Per-entity isolated stateful processes (Durable Objects)
- Event-driven async processing (Queues)
- Deduplication at the edge (KV)
- Alarm-based scheduled work within a stateful object

...OpenClaw doesn't give you these. You'd be adding a framework layer on top of infrastructure that already handles your core requirements.

**Example:** The SRE incident agent built at Datopian uses Durable Objects for per-incident state isolation and alarm-driven investigation turns. Replacing the DO + alarm pattern with OpenClaw would require a separate scheduler, a state store, and a queue — all of which Cloudflare already provides natively.

### 3. The task is a single LLM call

If your workflow is:
1. Receive input
2. Call LLM with prompt + structured output schema
3. Use the result

...you don't need an agent framework. You need `fetch()` and a JSON schema. Adding OpenClaw here is overhead without benefit.

### 4. Cost and latency are critical at scale

OpenClaw adds a runtime hop. For high-volume, low-latency use cases (real-time content processing, per-request enrichment, edge classification), the overhead matters. Cloudflare Workers AI runs inference at the edge with no external hop and a generous free tier.

---

## The hybrid pattern

The most practical architecture for teams already on Cloudflare:

```
Cloudflare Workers   ←  handles all infrastructure concerns
    │  webhook intake, auth, deduplication, queuing, state (DO), routing
    │
    ▼
OpenClaw / agent logic  ←  handles all intelligence concerns
    │  tool orchestration, reasoning loop, memory, LLM calls
    │
    ▼
Results back to Worker  ←  notify, store, respond
```

Cloudflare handles the operational layer — the parts that need to be fast, always-on, and globally distributed. OpenClaw handles the agent intelligence layer — the parts that benefit from better abstractions and easier iteration.

This split means you don't compromise on either: you get the serverless operational properties of Cloudflare and the agent quality of a purpose-built framework.

---

## Common mistakes

**Using OpenClaw for a prompt-and-response task.** If you're calling OpenClaw to run a single-turn prompt, you're adding a framework for no reason. Use the API directly.

**Hand-rolling an agent loop when OpenClaw would do it better.** If you find yourself writing turn management, tool call parsing, context window management, and retry logic by hand — stop and evaluate whether OpenClaw handles these. It likely does, and better.

**Running OpenClaw on Cloudflare Workers directly.** OpenClaw needs a persistent Node.js runtime. Workers are stateless and short-lived. Use a VPS, a PaaS, or Cloudflare Containers — not a plain Worker.

**Choosing OpenClaw because "AI agent" sounds right.** The label "agent" is overloaded. Not every LLM-powered feature needs an agent framework. If your task has a fixed number of steps and known inputs, a direct API call is simpler, cheaper, and easier to debug.

---

## Decision flowchart

```
Does the task require iterative reasoning with tool use?
├── No  → Direct LLM API call or CF Workers AI
└── Yes → Does it need to respond to events / run at the edge?
          ├── Yes → CF Workers (+ optional OpenClaw for the agent logic layer)
          └── No  → Does it need persistent memory or multi-session context?
                    ├── Yes → OpenClaw on VPS/PaaS
                    └── No  → Is the agent logic simple enough to hand-roll?
                              ├── Yes → Custom loop (keep it under ~200 lines)
                              └── No  → OpenClaw on VPS/PaaS
```
