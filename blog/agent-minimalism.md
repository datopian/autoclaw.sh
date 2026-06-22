---
title: "Agent minimalism: what shipping OpenClaw in production taught us"
description: "We deploy OpenClaw for a living. After a year, the biggest lesson is that most of the time you don't need it — you need a right-sized setup. On the token tax, two cases where we walked away, and why deterministic beats probabilistic more often than you'd think."
date: 2026-06-22
---

We deploy OpenClaw for a living. We wrote the tutorials, built the open-source deployment playbook, and ran it inside our own systems. So it's worth being honest about the biggest thing a year of that taught us:

**Most of the time, you don't need OpenClaw. You need a right-sized setup — and more often than people admit, a deterministic one.**

This isn't an anti-OpenClaw post. It's an argument for matching the tool to the job, against a current default that reaches for a full autonomous agent framework for problems that don't have agent-shaped needs.

## Where it earns its keep

OpenClaw is genuinely good when the work is actually agentic: open-ended, multi-step, tool-using tasks where the model has to plan, react, and recover, and where rich ambient context is the point rather than overhead. We've used it to automate a number of internal processes that fit that shape, and the framework's batteries-included context is a feature there, not a bug.

The trouble starts when you carry that same heavyweight default into problems that aren't agentic at all.

## The token bill nobody mentions

Here's what made this concrete for us. A trivial "hello", measured against OpenClaw `2026.6.9` (the current release as of this writing):

- **Plain API call:** ~30 tokens (14 in, 15 out).
- **Same "hello" through a default OpenClaw agent:** ~20,000 tokens.

That's roughly **650× more tokens to say hello** — before the model does any actual work. Where it goes, approximately:

| Injected on every call | ~tokens |
|---|---|
| System prompt (hardcoded agent behavior) | ~7,000 |
| Workspace files (`AGENTS.md`, `USER.md`, `SOUL.md`, `IDENTITY.md`, `TOOLS.md`, …) | ~3,000 |
| Tool / skill registry | ~1,000 |
| Two schemas | ~3,400 |
| Message framing + other overhead | balance to ~20,000 |

**How we measured:** we tokenized the full first-turn context an OpenClaw agent sends — system prompt, workspace files, tool registry, and schemas — and compared it against a single `hello` user message, using a standard byte-pair tokenizer. The exact total moves with how much you've put in your workspace files and how many skills you've enabled, so treat these as round numbers, not audited line items; a freshly populated agent lands in the ~20k neighborhood. The point isn't the third significant figure — it's the order of magnitude. Every token in that table is re-sent on *every* call.

For an autonomous agent that genuinely needs to know its tools, its workspace, and its operating rules, that context is an investment. For a narrow, high-volume task, it's pure tax — paid on every single call, forever.

## Two cases where we walked away

**SRE agent for our managed data portals.** We needed something to watch portals and respond to operational signals. We built it on **Cloudflare Workers AI with no OpenClaw at all.** The job was specific and bounded; a focused setup at the edge did it without a framework, without the context tax, and without another moving part to operate.

**Data-discovery chatbots.** We started on OpenClaw and **dropped it.** The injected context (that ~20k of system prompt, workspace files, and schemas) was enormous and almost entirely irrelevant to "help a user find the right dataset." We replaced it with a small, specific prompt carrying only what the task needed. Cheaper, faster, easier to reason about, and the answers got *better* — less to distract the model.

## The pattern: deterministic beats probabilistic more often than you'd think

The deeper lesson underneath both: a lot of what gets called "agent work" doesn't want a probabilistic agent loop at all. It wants a **deterministic pipeline with one tight LLM call where judgment is actually required.** Determinism gives you reliability, debuggability, and a flat, predictable cost. An autonomous agent gives you flexibility you frequently don't need, in exchange for variance and a token bill you always pay.

Reach for the agent when the problem is genuinely open-ended. Reach for code — plus a small prompt — when it isn't.

## A decision rule

Before you put OpenClaw (or any agent framework) on a task, ask:

1. **Is the task open-ended and multi-step, or is it one bounded job?** Bounded → small prompt or plain code.
2. **Does it need ambient context (tools, workspace, memory), or just the input in front of it?** Just the input → don't inject 20k tokens to ignore them.
3. **Does it need to be right every time?** If yes → make the deterministic parts deterministic; spend the LLM only where judgment is unavoidable.
4. **Is it high-volume?** Per-call overhead compounds. At volume, the context tax dominates your bill.

If you answer "bounded / just the input / must be right / high-volume," you don't have an agent problem. You have an engineering problem with one LLM call in it.

## If you *do* need to deploy OpenClaw

When the problem really is agent-shaped, deploying OpenClaw well is its own skill — hosting, memory, integrations, multi-agent workflows. That's what we put into our open-source playbook ([autoclaw.sh](https://autoclaw.sh)) and a [hands-on video series](https://www.youtube.com/watch?v=QRfnHmO80jw&list=PLMGxXkdb_1Kx9MyyZxLW-vke5iGXw-EGZ). Use it when the job earns it.

But the most useful thing we can tell you after a year of this is the part nobody selling agent frameworks will: **start minimal, and make the framework prove it's needed.**
