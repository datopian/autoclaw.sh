---
title: "Connecting OpenClaw to Your CRM"
description: "How to wire OpenClaw agents into HubSpot, Salesforce, or any CRM via MCP — and what that unlocks for sales and ops workflows."
date: 2026-04-06
draft: true
---

Modern sales teams spend hours every week updating CRM records, logging calls, and chasing down contact details. OpenClaw agents can handle most of that automatically — here's how to set it up.

## Why CRM integration matters

An agent that can read and write your CRM becomes a force multiplier. It can:

- Log meeting notes directly to contact records after a call
- Enrich leads with public data before your team touches them
- Draft follow-up emails based on deal stage and last activity
- Flag stale deals that need attention

## Connecting via MCP

OpenClaw uses the Model Context Protocol (MCP) to talk to external tools. Most major CRMs either have an official MCP server or a community-built one.

**HubSpot** has a first-party MCP server. Add it to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "npx",
      "args": ["-y", "@hubspot/mcp-server"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "your-private-app-token"
      }
    }
  }
}
```

**Salesforce** — use the community `@salesforce/mcp` package with OAuth credentials.

Once connected, your agent can call CRM tools directly:

```
Update contact John Smith's last_contacted date to today and add a note: "Demo call — interested in enterprise plan, follow up in 2 weeks."
```

## What to automate first

Start with the highest-friction, lowest-judgment tasks:

1. **Post-call logging** — have the agent write meeting summaries to the deal record
2. **Lead enrichment** — pull LinkedIn/company data when a new contact is created
3. **Weekly pipeline review** — generate a digest of deals by stage with recommended next actions

Avoid automating anything that touches pricing, contracts, or customer commitments without a human review step.

## Keeping humans in the loop

Use OpenClaw's approval workflows for any write operations that matter. For CRM work, a good rule of thumb: reads are free, writes to active deals need confirmation.

See the [CRM integration playbook](/playbooks/crm-integration) for step-by-step setup instructions.
