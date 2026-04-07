---
title: Multi-Agent Workflows
description: Design and implement multi-agent AutoClaw workflows with specialist agents, orchestrators, handoffs, and approval points.
draft: true
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

**Screenshot placeholder: agent workspace with `AGENTS.md`, `SOUL.md`, and `TOOLS.md` visible**

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

**Screenshot placeholder: example `AGENTS.md` for a specialist agent**

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

**Screenshot placeholder: `TOOLS.md` showing a narrow tool policy**

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

**Screenshot placeholder: workspace `skills/` directory with one custom skill**

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

**Screenshot placeholder: first successful single-agent test run**

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

If you cannot describe the workflow clearly in plain language, do not create multiple agents yet.

**Screenshot placeholder: workflow written as a simple staged sequence**

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

**Screenshot placeholder: structured handoff example between workflow stages**

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

**Screenshot placeholder: approval point inside a workflow**

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

Do not create the orchestrator first and improvise the specialists later. Get the specialist roles clear first.

**Screenshot placeholder: list of specialist agents created in OpenClaw**

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

**Screenshot placeholder: orchestrator `AGENTS.md` defining routing rules**

### Step 3: Enable agent-to-agent handoff

This is the practical center of the whole setup.

OpenClaw exposes session tools for agent-to-agent coordination. In practice, the orchestrator needs a way to send work to the specialist agents and get results back.

That means the orchestrator should be configured to:

- discover the specialist sessions it can use
- send structured work to those sessions
- wait for results
- continue the workflow based on those results

When you write the orchestrator instructions, be explicit about:

- which agent receives which kind of task
- what payload should be sent
- what shape the reply should have
- what to do if a specialist fails or returns incomplete data

If the orchestrator just says “ask another agent for help,” the workflow will be unstable.

**Screenshot placeholder: orchestrator sending structured work to a specialist agent**

### Step 4: Route the entry channel to the orchestrator

The user-facing entrypoint should normally hit the orchestrator, not one of the specialists.

That means your existing entry surface, such as WebChat, Slack, Teams, or another configured channel, should send the initial request to the orchestrator.

The orchestrator then decides which specialist should work on the next stage.

This keeps the user talking to one front door, instead of needing to know which specialist to contact.

**Screenshot placeholder: entry channel mapped to the orchestrator**

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

**Screenshot placeholder: first successful multi-agent end-to-end run**

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
