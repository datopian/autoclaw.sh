---
title: Multi-Agent Workflows
description: Design and implement multi-agent OpenClaw workflows with specialist agents, orchestrators, handoffs, and approval points.
draft: false
---

# Multi-Agent Workflows

A multi-agent OpenClaw workflow lets you split one business process across several specialized agents instead of forcing one agent to do everything. This is useful when the work has clear stages, different tool requirements, or approval points. In this guide, you will learn how to configure single agents, define handoffs, add an orchestrator, and turn one real workflow into a working multi-agent setup.

## Motivation

A multi-agent workflow is useful when one OpenClaw agent is being asked to do too many different jobs at once.

That usually looks like this:

- the same agent has to interpret requests
- gather context
- decide what should happen next
- use different tools in different systems
- review its own output
- take external actions

That is where reliability usually starts to fall apart.

A multi-agent workflow solves that by splitting the work into smaller responsibilities. One agent coordinates the flow. Other agents do narrower tasks.

Use a multi-agent workflow when:

- the work has clear stages
- different stages need different tools
- some steps should be isolated for safety
- you want explicit review points
- one agent is becoming overloaded

Do not use a multi-agent workflow when one narrow agent can already do the job well. Extra agents add structure, but they also add complexity.

## How An OpenClaw Agent Works

At a practical level, an OpenClaw agent has four main parts:

- a `workspace`
- a set of `instruction files`
- access to specific `tools` and `skills`
- one or more `runs` or triggers that actually send work to it

If you want a useful mental model, think of an agent like this:

- the workspace is its home
- the instruction files define how it thinks and behaves
- the tools and skills define what it can do
- the run or trigger is what makes it actually work on something

In a default setup, the main workspace lives under `~/.openclaw/workspace`.

OpenClaw also injects important prompt files into the workspace, especially:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`

Skills live under:

- `~/.openclaw/workspace/skills/<skill>/SKILL.md`

Those files are where most of the practical configuration happens.

## Two Delegation Patterns

The orchestrator has two tools for sending work to other agents:

**`sessions_send`** targets a named agent's session directly. The session is created on first contact if it does not exist yet, and persists under the target agent's namespace — for example, `agent:research-agent:main`. History accumulates across runs. This is the standard pattern for delegating to named specialist agents and is what this guide uses throughout.

**`sessions_spawn`** creates a fresh subagent session scoped to the calling orchestrator. The spawned session lives under a key like `agent:orchestrator:subagent:uuid`, not under the target agent's namespace. You can point it at a named agent's workspace via the `agentId` parameter. Sessions created by `sessions_spawn` persist by default; pass `cleanup: "delete"` to remove them after completion. Use this for anonymous one-off tasks where you do not want the work attributed to a named specialist's session.

| | `sessions_send` | `sessions_spawn` |
|---|---|---|
| Session namespace | target agent's own | spawning orchestrator's |
| Persists by default | Yes | Yes (use `cleanup: "delete"` to remove) |
| Uses named agent config | Yes | Yes (with `agentId`) |
| Best for | named specialist delegation | anonymous one-off tasks |

In this guide, `research-agent` and `crm-agent` are named specialists registered in `openclaw.json`. The orchestrator delegates to them via `sessions_send`, which creates and reuses their named sessions.

## How To Configure An OpenClaw Agent

This section is the first practical part. The outcome should be one agent that has a clear role, clear boundaries, and a small toolset.

### Step 1: Create the agent

Create a new agent from the OpenClaw CLI:

```bash
openclaw agents add
```

The wizard will walk you through the main setup choices.

In the current flow, you should expect to choose:

- the `agent name`
- the `workspace directory`
- whether to `copy auth profiles from "main"`
- whether to `configure model/auth now`
- the `model/auth provider`
- the `auth method`
- whether to `configure chat channels now`

For most specialist agents, a good default is:

- give the agent a clear role-based name
- keep the suggested workspace path unless you have a reason to change it
- copy auth profiles from `main` if that saves setup time and matches your environment
- configure model/auth now so the agent is immediately usable
- skip channel setup unless this agent is meant to be user-facing

Good names:

- `orchestrator`
- `research-agent`
- `crm-agent`
- `outreach-agent`
- `content-agent`

Bad names:

- `assistant-2`
- `main-v2`
- `general-helper`

When the wizard finishes, verify that OpenClaw confirms these were created or updated:

- `~/.openclaw/openclaw.json`
- `~/.openclaw/workspace/<agent-name>`
- `~/.openclaw/agents/<agent-name>/sessions`

That gives you three important things right away:

- the agent exists in the OpenClaw config
- the agent has its own workspace
- the agent has a sessions directory for runs and coordination

### Step 2: Open the agent workspace

Once the agent exists, open its workspace and inspect the instruction files.

At minimum, you should look at:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`

For a basic agent, these are the most important jobs of each file:

- `AGENTS.md`: role, responsibilities, boundaries, operating rules
- `SOUL.md`: tone, style, persistent behavioral guidance
- `TOOLS.md`: what tools exist and how the agent should use them safely

If you are setting up a specialist agent, most of the important behavior should live in `AGENTS.md` and `TOOLS.md`, not in vague prompts sent during a chat.

A fresh agent workspace looks like this:

```
/home/node/.openclaw/workspace/crm-agent/
├── AGENTS.md
├── BOOTSTRAP.md
├── HEARTBEAT.md
├── IDENTITY.md
├── SOUL.md
├── TOOLS.md
└── USER.md
```

### Step 3: Write the agent's job in `AGENTS.md`

Do not write a poetic personality description. Write an operating brief.

A practical starting template looks like this:

```md
# CRM Agent

## Purpose
Update CRM records and write the next recommended action.

## Use This Agent When
- a lead has already been qualified
- the workflow needs a CRM update
- structured lead data is available

## Inputs
- lead name
- company
- qualification score
- summary notes
- recommended next step

## Outputs
- CRM record updated
- record ID or confirmation
- short change summary

## Boundaries
- Do not send outreach.
- Do not browse unrelated systems.
- Do not decide lead strategy.
- Stop if required fields are missing.
```

This is what makes the agent predictable.

Here is a real `AGENTS.md` from the `crm-agent` used in this guide:

```md
# CRM Agent

## Purpose
Prepare CRM-ready payloads from structured lead data and report whether the payload is safe to write.

## Use This Agent When
- a lead has already been researched or qualified
- the workflow has enough information to prepare a CRM record
- the next step is CRM preparation or validation

## Required Output Format
Always return JSON with these fields:
- `action`
- `company`
- `contact`
- `status`
- `crm_payload`
- `missing_fields`
- `notes`
- `safe_to_write`

## Rules
- Build a CRM-ready payload from the provided lead data.
- If required fields are missing, list them in `missing_fields`.
- If the request says not to perform a real write, only prepare the payload.
- Do not research missing company information.
- Do not send outreach.
- Do not decide sales strategy beyond the payload itself.
```

### Step 4: Limit the toolset in `TOOLS.md`

A common failure mode is giving an agent access to everything.

Instead, write down exactly what the agent can use and how it should use it.

For example, a CRM agent might be allowed to:

- use the CRM integration
- read structured lead inputs
- return update confirmations

And it should not be allowed to:

- send email
- browse the web unless necessary
- call shell tools
- act in systems unrelated to CRM

If your agent only needs one or two tools, keep it that way.

Here is the `TOOLS.md` from the same `crm-agent`:

```md
# TOOLS.md - CRM Agent

## Tool Policy

Use only the tools needed to read structured workflow input and update the CRM.

## Allowed

- CRM integration
- structured workflow payloads

## Avoid

- general browsing
- email or messaging actions
- shell commands unless explicitly required by your CRM setup
```

### Step 5: Add workflow-specific skills when needed

If an agent needs reusable operating logic, put it in a skill instead of burying it in ad hoc prompts.

Create a skill under the workspace skills directory, for example:

```text
~/.openclaw/workspace/skills/qualify-lead/SKILL.md
```

That skill can contain:

- qualification criteria
- output format rules
- escalation rules
- domain-specific instructions

This is especially useful when the same logic needs to be reused across runs.

A skills directory follows this layout:

```
~/.openclaw/workspace/skills/
└── qualify-lead/
    └── SKILL.md
```

OpenClaw also ships with bundled skills available to all agents. The orchestrator in this guide had access to:

```
coding-agent   — delegate coding tasks to background agents
healthcheck    — security hardening and risk-tolerance checks
node-connect   — diagnose pairing and connection failures
skill-creator  — create and edit agent skills
weather        — current weather via wttr.in or Open-Meteo
```

Custom skills you create under the workspace `skills/` directory are scoped to that agent.

### Step 6: Test the agent on one narrow task

Once the agent exists and its workspace files are in place, test it on exactly one realistic task.

Examples:

- ask the research agent to summarize one company
- ask the CRM agent to process one structured update
- ask the content agent to draft one short post from one brief

Use your existing OpenClaw entrypoint, such as WebChat or the channel you already have configured.

A good first test is small enough that you can tell, very quickly, whether the agent:

- understood its role
- stayed inside its boundaries
- used the right tools
- returned the expected output format

If the agent fails here, fix the single-agent setup before moving to workflows.

## How To Set Up A Workflow

A workflow is not the same thing as an agent.

An agent is one worker.
A workflow is the sequence of work.

A useful workflow has these parts:

- a `trigger`
- a sequence of `stages`
- one or more `handoffs`
- optional `approval points`
- a clear `end state`

### Step 1: Write the workflow in plain language

Start with one repeated business process.

Examples:

- a new lead arrives
- a Slack request is submitted
- a content brief is received
- an ops request is filed

Then write the process as a sequence.

Example:

1. receive the request
2. gather context
3. classify the request
4. prepare an action or draft
5. review if needed
6. execute or return the result

If you cannot describe the workflow clearly in plain language, do not create multiple agents yet. Write it out before touching any OpenClaw config.

### Step 2: Define the handoffs

For each step, decide what gets passed forward.

For example, do not say:

- “send the lead to the next agent”

Say:

- “send contact name, company, qualification score, summary notes, and recommended next action”

A good handoff is explicit about:

- required fields
- output structure
- what happens if something is missing

This is one of the most important parts of a reliable OpenClaw workflow.

Here is what the orchestrator sent to `research-agent` in the working demo:

```
[Tue 2026-04-07 19:08 UTC] Please research the following company and lead,
and return a structured JSON result.

Lead details:
- Company: Datopian
- Website: https://datopian.com
- Contact: Jane Doe
- Role: Head of Operations
- Notes: Interested in automating sales follow-up and CRM updates.

Return a JSON object with these fields:
- company
- website
- website_status
- summary
- key_facts
- qualification_notes
- flags
```

The message is explicit: one company, one contact, exact output fields. There is no ambiguity about what the agent should return.

### Step 3: Decide where human approval belongs

Not every workflow should execute automatically from start to finish.

Approval points are especially useful before:

- sending external email
- publishing content
- updating sensitive records
- taking financial or legal actions

A safe default is:

- automate preparation first
- automate execution second

That means the workflow prepares a draft or recommendation, but a human approves the risky step.

The clearest pattern for a soft approval point is a `safe_to_write` flag in the specialist's output. The orchestrator stops and waits for a human decision when that field is `false`.

Here is how the `crm-agent` signals it in practice:

```json
{
  "safe_to_write": false,
  "missing_fields": [
    "contact_email",
    "contact_phone",
    "contact_verification_source",
    "confirmed_budget"
  ]
}
```

The payload is ready, but no CRM write happens until a human reviews the missing fields and confirms the next step. This is enough for most early-stage workflows.

## How To Set Up A Multi-Agent Workflow In OpenClaw

Once the workflow is clear, you can turn it into a multi-agent setup.

The simplest useful pattern is:

- one `orchestrator`
- two to four `specialist agents`

The orchestrator routes the work. The specialists do the narrow tasks.

### Step 1: Create the specialist agents

Create the specialist agents one by one.

For example, for a CRM and outreach workflow you might create:

- `research-agent`
- `qualification-agent`
- `crm-agent`
- `outreach-agent`

Use the same process from the single-agent section:

```bash
openclaw agents add
```

For each one, configure:

- `AGENTS.md`
- `TOOLS.md`
- any workflow-specific skills it needs

Do not rely on the orchestrator alone and improvise the specialist roles later. What matters is that the specialist roles and tool allowlists are clear before you test delegation.

Example from a real setup:

```text
$ openclaw agents add

◇  Agent name
│  orchestrator
◇  Workspace directory
│  /home/node/.openclaw/workspace/orchestrator
◇  Copy auth profiles from "main"?
│  Yes
◇  Configure model/auth for this agent now?
│  Yes
◇  Configure chat channels now?
│  No
Updated ~/.openclaw/openclaw.json
Workspace OK: ~/.openclaw/workspace/orchestrator
Sessions OK: ~/.openclaw/agents/orchestrator/sessions
└  Agent "orchestrator" ready.
```

### Step 2: Create the orchestrator agent

Now create the orchestrator.

Its job is not to do all the work itself. Its job is to:

- accept the incoming request
- decide which specialist should handle the next stage
- pass the right structured input forward
- collect the result
- decide whether to continue, stop, or escalate

A practical orchestrator brief in `AGENTS.md` should include:

- what requests it accepts
- which specialists exist
- when to call each one
- what a completed workflow looks like
- when human approval is required

Here is the real `AGENTS.md` from the orchestrator used in this guide:

```md
# Orchestrator Agent

## Purpose
Route inbound workflow requests to the right specialist agent, collect their
outputs, and decide the next workflow step.

## Specialists Available
- `research-agent`: gathers company and lead context
- `crm-agent`: prepares CRM-ready payloads or validates CRM fields

## Delegation Rules
- When company research, lead enrichment, or factual verification is needed,
  delegate to `research-agent`.
- When the next step is preparing a CRM-ready payload or checking whether a
  CRM write is safe, delegate to `crm-agent`.
- Do not perform specialist work yourself if one of the specialists can do it.

## How To Delegate
Use `sessions_send` to delegate to named specialists. Specify the session key for the target agent and your structured request. Ask for a JSON result with the exact fields listed in each specialist's `AGENTS.md`.

Use `sessions_spawn` with `agentId` when you want an isolated one-off task that should not accumulate in the specialist's session history. Add `cleanup: "delete"` if you want the spawned session removed after completion.

## Boundaries
- Do not invent company facts.
- Do not skip specialist delegation when the request matches a specialist role.
- Do not update CRM records directly.
- Stop when approval is required.
```

### Step 3: Enable agent-to-agent handoff

This is the practical center of the whole setup.

OpenClaw uses session tools for agent-to-agent coordination. In practice, the orchestrator needs to send structured work to the right specialist and continue the workflow when it replies.

Before testing handoffs, verify these configuration pieces are in place.

#### Required configuration

In `~/.openclaw/openclaw.json`:

- enable `tools.agentToAgent.enabled`
- include the participating agents in `tools.agentToAgent.allow`
- give the orchestrator the session tools it needs, especially:
  - `sessions_list`
  - `sessions_history`
  - `sessions_send`
  - `sessions_spawn`
  - `sessions_yield`
  - `session_status`
  - `subagents`
- add the specialist agents to `orchestrator.subagents.allowAgents`

Without those settings, the orchestrator may exist and still be unable to talk to the specialist agents.

Real config excerpt:

```json
{
  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": ["orchestrator", "research-agent", "crm-agent"]
    }
  },
  "agents": {
    "list": [
      {
        "id": "orchestrator",
        "tools": {
          "allow": [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "sessions_yield",
            "session_status",
            "subagents"
          ]
        },
        "subagents": {
          "allowAgents": ["research-agent", "crm-agent"]
        }
      }
    ]
  }
}
```

#### How sessions are created

When the orchestrator calls `sessions_send` targeting `agent:research-agent:main`, OpenClaw creates that session on the first contact if it does not exist yet. You do not need to pre-initialize specialist agents.

When the orchestrator calls `sessions_spawn`, the new session is scoped to the orchestrator itself (`agent:orchestrator:subagent:uuid`), not to the target agent. Use `agentId` to run the task using a specific agent's workspace, and `cleanup: "delete"` if you want the session removed afterward.

#### Check the gateway device scopes if handoff still fails

If `sessions_send` or `sessions_spawn` still fail with a `pairing required` or permission-style error, check the paired backend device at:

```text
~/.openclaw/devices/paired.json
```

In the working setup used for this guide, the backend `gateway-client` device needed full operator scopes, not just read access. The entry should include:

- `operator.admin`
- `operator.read`
- `operator.write`
- `operator.approvals`
- `operator.pairing`

When that device only had `operator.read`, agent-to-agent `sessions_send` calls failed even though all the agents were running on the same instance. Once the backend device had full operator scopes, the orchestrator could send work to the specialist sessions successfully.

> **Warning:** This is the most common silent failure in a fresh multi-agent setup. The agents run, the config looks correct, but handoffs fail with a `pairing required` or permission error. The fix is in `paired.json`, not in `openclaw.json`. Check device scopes before spending time debugging agent config.

Real `paired.json` excerpt from the working setup:

```json
{
  "clientId": "gateway-client",
  "clientMode": "backend",
  "role": "operator",
  "scopes": [
    "operator.admin",
    "operator.read",
    "operator.write",
    "operator.approvals",
    "operator.pairing"
  ],
  "approvedScopes": [
    "operator.admin",
    "operator.read",
    "operator.write",
    "operator.approvals",
    "operator.pairing"
  ]
}
```

Once those prerequisites are in place, the orchestrator should be configured to:

- send structured work to each specialist
- wait for results
- continue the workflow based on those results

When you write the orchestrator instructions, be explicit about:

- which agent receives which kind of task
- what payload should be sent
- what shape the reply should have
- what to do if a specialist fails or returns incomplete data

If the orchestrator just says “ask another agent for help,” the workflow will be unstable.

The session log records each handoff with its source. Here is what the incoming message looks like on the receiving agent when the orchestrator uses `sessions_send`:

```json
{
  "role": "user",
  "provenance": {
    "kind": "inter_session",
    "sourceSessionKey": "agent:orchestrator:main",
    "sourceChannel": "webchat",
    "sourceTool": "sessions_send"
  },
  "content": [{
    "type": "text",
    "text": "Please research the following company and lead, and return a structured JSON result."
  }]
}
```

The `sourceTool` field tells you exactly which delegation pattern was used.

### Step 4: Route the entry channel to the orchestrator

The user-facing entrypoint should normally hit the orchestrator, not one of the specialists.

That means your existing entry surface, such as WebChat, Slack, Teams, or another configured channel, should send the initial request to the orchestrator.

The orchestrator then decides which specialist should work on the next stage.

This keeps the user talking to one front door, instead of needing to know which specialist to contact.

In the working demo for this guide, the source channel was `webchat` and the orchestrator handled routing from there:

```json
{
  "sourceSessionKey": "agent:orchestrator:main",
  "sourceChannel": "webchat",
  "sourceTool": "sessions_send"
}
```

You do not need to bind Slack or another external channel just to test the workflow. WebChat is enough for the first end-to-end pass.

### Step 5: Run one end-to-end test

Now test the whole chain with one realistic request.

Examples:

- one inbound lead
- one Slack request
- one content brief
- one ops ticket

Watch for these failure modes:

- bad routing
- weak handoffs
- missing required fields
- a specialist doing work outside its role
- an orchestrator that tries to do everything itself
- too much tool access

Do not broaden the system until one end-to-end path works cleanly.

Real CRM agent response from the working end-to-end flow:

```json
{
  "action": "prepare_crm_payload",
  "company": {
    "name": "Datopian",
    "website": "https://datopian.com",
    "industry": "Data Management / Consulting"
  },
  "contact": {
    "name": "Jane Doe",
    "title": "Head of Operations",
    "email": null,
    "phone": null,
    "verified": false
  },
  "status": "qualified_high",
  "crm_payload": {
    "company_name": "Datopian",
    "contact_name": "Jane Doe",
    "lead_source": "Inbound",
    "next_action": "Discovery call",
    "priority": "High"
  },
  "missing_fields": ["contact_email", "contact_phone"],
  "safe_to_write": false
}
```

## Common Failure Modes And Fixes

### The orchestrator does everything itself

**Symptom:** The orchestrator replies directly instead of delegating. Specialists are never called.

**Cause:** The orchestrator's `AGENTS.md` does not list delegation rules explicitly enough, or the specialists are not in `subagents.allowAgents`.

**Fix:** Add explicit delegation rules to the orchestrator's `AGENTS.md` — name each specialist, when to call it, and what to send. Verify `subagents.allowAgents` in `openclaw.json` includes both specialists.

---

### `sessions_spawn` or `sessions_send` fails with a permission or pairing error

**Symptom:** Handoffs fail even though all agents are running on the same instance.

**Cause:** The backend `gateway-client` device in `paired.json` only has `operator.read` scope.

**Fix:** Update `paired.json` to include `operator.admin`, `operator.write`, `operator.approvals`, and `operator.pairing`. See the full config in the gateway scopes section above.

---

### Specialist goes outside its role

**Symptom:** The research agent starts updating CRM fields, or the CRM agent starts browsing the web.

**Cause:** `TOOLS.md` is too permissive, or `AGENTS.md` boundaries are vague.

**Fix:** Tighten the tool allowlist in `TOOLS.md` to only what the agent strictly needs. Add explicit `Do not` rules to the `Boundaries` section of `AGENTS.md`.

---

### Handoff output is unpredictable

**Symptom:** The orchestrator receives different field names or structures on each run, breaking downstream steps.

**Cause:** The handoff message does not specify an exact output format, so the specialist improvises.

**Fix:** List every required field in the delegation message. If the specialist's `AGENTS.md` includes a `Required Output Format` section, the structure will be stable across runs.

---

### Workflow runs but results are wrong

**Symptom:** The end-to-end test completes, but the CRM payload is missing fields or the research summary is shallow.

**Cause:** Single-agent quality is poor. A weak specialist will not improve inside a larger workflow.

**Fix:** Test each specialist in isolation first. Fix quality at the single-agent level before connecting agents together.

## Recommendations And Best Practices

- `Start smaller than you think.` One good workflow is better than five confusing ones.
- `One agent, one job.` Narrow agents are easier to trust.
- `Keep the orchestrator thin.` It should route and monitor, not do specialist work.
- `Use explicit outputs.` Every agent should return something structured and predictable.
- `Limit tools aggressively.` Tool sprawl makes debugging harder.
- `Put risky actions behind approval.` Especially early on.
- `Design for failure.` Decide what happens when context is missing or a stage cannot complete.
- `Log handoffs.` If you cannot inspect what moved between agents, you cannot improve the workflow.
- `Fix single-agent quality first.` A bad specialist agent will not become good just because it sits inside a larger workflow.

## Example Multi-Agent Workflows

### Example 1: CRM And Outreach Workflow

- Orchestrator: receives the lead and routes the workflow
- Research agent: enriches the lead
- Qualification agent: scores or classifies it
- Outreach agent: drafts the next message
- CRM agent: updates the record and next action
- Human reviewer: approves outbound communication if needed

### Example 2: Slack Assistant With Specialist Agents

- Orchestrator: reads the Slack request and routes it
- Research agent: gathers background context
- Ops agent: performs internal system actions
- Content agent: drafts text output when needed
- Review agent: checks whether the response is ready to return

### Example 3: Content Pipeline

- Orchestrator: manages sequence and handoffs
- Research agent: gathers source material
- Drafting agent: creates the first draft
- Editing agent: improves structure and clarity
- Publishing agent: prepares output for the target channel
- Human reviewer: approves before publication

## Final Advice

If you are new to multi-agent workflows, do not begin with a complicated diagram.

Begin by creating one good specialist agent. Then define one simple workflow. Then add an orchestrator only when the handoffs and boundaries are already clear.

That is how a multi-agent workflow becomes usable in OpenClaw: not by adding more agents, but by making each agent easier to trust.
