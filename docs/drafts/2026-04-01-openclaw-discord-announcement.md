# Draft: OpenClaw Discord Announcement

Status: internal draft for review  
Date: 2026-04-01  
Audience: Discord communities, technical early adopters

## Recommended framing

This should not read like a product launch.

The right tone is:

- direct
- technical
- honest about what changed
- explicit that this is an open-source framework / experiment
- inviting feedback from people deploying agents in practice

## Version 1: short announcement

We have been experimenting with **OpenClaw Autopilot** over the last few weeks and one conclusion became pretty clear:

the main problem is not "host OpenClaw as SaaS."

The harder and more useful problem is how to **deploy and operate agent systems well**:

- infra and install
- secrets and access
- memory and state
- sandboxing and tool permissions
- billing / BYOK trade-offs
- backups, observability, and recovery

So we are moving Autopilot toward an **open-source framework / playbook for deploying OpenClaw and similar agent systems**, rather than treating it as a polished hosted product.

We will be publishing deployment patterns, reference implementations, infra notes, and failure modes as we go.

If you are working on OpenClaw or agent deployment more generally, I would be interested to compare notes.

Links:
- repo: `<repo link>`
- site/docs: `<site link>`
- write-up: `<post link>`

## Version 2: fuller announcement

Over the last several weeks we have been testing an early version of **OpenClaw Autopilot**.

We initially approached it as a thin hosted layer around OpenClaw: make deployment easier, add some defaults, and smooth out the rough edges.

That turned out to be useful, but mostly because it forced the real problems into the open.

The hard part is not just giving people a hosted UI. The hard part is everything around actually running agent systems in practice:

- where they run
- who controls infra and keys
- how memory/state should work
- how tool access should be constrained
- how to handle cost, quotas, and billing
- how to back things up and recover them
- how to observe failures and keep systems stable

Our current view is that this space is still much more **framework-first** than **SaaS-first**.

So instead of positioning Autopilot as a finished product, we are repositioning it as an **open-source framework / experiment for deploying and operating agent systems**.

The practical output will be things like:

- deployment examples
- architecture notes
- infrastructure trade-offs
- operational playbooks
- reference configurations

We are going to share the work in the open as we build it.

If you are already deploying OpenClaw, or wrestling with similar agent infra questions, I would like to hear what is working, what is brittle, and where the sharp edges are for you.

Links:
- repo: `<repo link>`
- site/docs: `<site link>`
- write-up: `<post link>`

## Optional closing line

Still early, but it feels like there is a real gap here between "cool agent demo" and "something you can actually run and maintain."

## Optional reply if people ask "why not just make it SaaS?"

Our current view is that teams still want too much control over infra, models, keys, data, and permissions for a thin hosted layer to be the whole answer. The more useful thing right now seems to be an open deployment framework plus operational playbooks.

## Optional reply if people ask "what are you publishing first?"

The first materials will likely be around deployment paths, local setup, infra choices, memory/state trade-offs, tool access, and the operational issues that show up once agents are used for real work.
