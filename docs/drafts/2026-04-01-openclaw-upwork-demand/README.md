# OpenClaw Upwork Demand Analysis

## What We Extracted

We extracted direct `OpenClaw` mentions from Upwork search results and stored them in `jobs_openclaw.csv`.

The collection covered result pages `1` through `45`, which corresponded to roughly `445` search results. The raw extracted dataset contains `326` rows.

We also created a labeled version, `jobs_openclaw_labeled.csv`, which adds action-oriented tags to each listing so examples can be filtered later by concrete requested actions such as:

- `api_key_auth_issues`
- `slack_integration`
- `vps_cloud_setup`
- `mac_setup`
- `crm_integration`
- `teams_azure_integration`

## How It Was Categorized

The analysis was done in two layers.

First, we filtered obvious noise such as non-software `claw machine` listings.

Second, instead of relying only on broad buckets, we labeled each listing with concrete requested actions derived from the title and description. That means the working unit is not just `integration` or `setup`, but things like:

- `install OpenClaw on Mac`
- `deploy OpenClaw on VPS`
- `connect OpenClaw to Slack`
- `fix gateway issues`
- `resolve API key / auth problems`
- `integrate OpenClaw with CRM`

These labels overlap by design, since a single job can ask for setup, CRM integration, email workflows, and debugging at the same time.

## Overview

At a high level, the demand is strongly practical. Buyers are not mainly asking for abstract advice or generic AI strategy. They are asking for OpenClaw to be installed, configured, secured, integrated into business systems, and fixed when it breaks.

The strongest recurring themes are:

- setup and deployment
- CRM and email workflows
- business automation
- private and self-hosted environments
- Claude and Claude Code usage
- concrete debugging work around authentication, connectivity, and reliability

## Practical Topic Ideas With Counts

These are action-level topic counts from the labeled dataset. They are mention counts, not mutually exclusive job counts.

### Setup And Deployment

- `Install or set up OpenClaw on Mac / Mac Mini` — `48 mentions`
- `Install or set up OpenClaw on Windows / WSL / Ubuntu` — `16 mentions`
- `Deploy OpenClaw on VPS / Hostinger / cloud server` — `61 mentions`
- `Install or set up OpenClaw locally` — `24 mentions`
- `Secure / private / isolated OpenClaw deployments` — `76 mentions`

### Integrations

- `OpenClaw + CRM integration` — `87 mentions`
- `OpenClaw + Slack integration` — `25 mentions`
- `OpenClaw + Microsoft Teams / Azure Bot` — `21 mentions`
- `OpenClaw + email / Gmail workflows` — `69 mentions`
- `OpenClaw + browser automation` — `29 mentions`
- `OpenClaw + SMS` — `15 mentions`
- `OpenClaw + Ollama / local models` — `14 mentions`
- `OpenClaw + Claude / Claude Code` — `90 mentions`
- `OpenClaw + n8n / Make` — `59 mentions`

### Workflow And Architecture

- `OpenClaw multi-agent / sub-agent workflows` — `47 mentions`
- `Business automation with OpenClaw` — `214 mentions`

That business-automation lane can be broken down further into specific use cases:

- `Marketing automation` — `90 mentions`
- `CRM / pipeline management` — `89 mentions`
- `Email outreach / inbox workflows` — `69 mentions`
- `SaaS / internal operations` — `67 mentions`
- `Content creation / publishing` — `65 mentions`
- `Sales workflows` — `40 mentions`
- `E-commerce operations` — `24 mentions`
- `Lead generation / prospecting` — `20 mentions`
- `Real estate workflows` — `18 mentions`
- `Customer support / conversation handling` — `10 mentions`
- `Logistics / transportation` — `5 mentions`
- `Legal workflows` — `3 mentions`

### Errors, Fixes, And Support

- `Debug auth / API key / rate-limit issues` — `44 mentions`
- `Debug gateway / connectivity issues` — `20 mentions`
- `Debug reliability / stabilization issues` — `26 mentions`
- `Training / consultation / live help` — `44 mentions`

## Ranked Video Backlog

These are practical video-title candidates derived from the demand patterns above.

- `How to Use OpenClaw for Business Automation` — `214 mentions`
- `OpenClaw + Claude Code: Real Workflow Setup` — `90 mentions`
- `OpenClaw for Marketing Automation` — `90 mentions`
- `OpenClaw CRM Integration: GoHighLevel and HubSpot` — `87 mentions`
- `How to Secure a Private OpenClaw Deployment` — `76 mentions`
- `OpenClaw Email and Gmail Workflows` — `69 mentions`
- `OpenClaw for SaaS and Internal Operations` — `67 mentions`
- `OpenClaw Content Creation and Publishing Workflows` — `65 mentions`
- `How to Deploy OpenClaw on VPS / Hostinger` — `61 mentions`
- `OpenClaw + n8n / Make Integration` — `59 mentions`
- `How to Install OpenClaw on Mac / Mac Mini` — `48 mentions`
- `How to Design Multi-Agent OpenClaw Workflows` — `47 mentions`
- `How to Fix OpenClaw API Key, Auth, and Rate-Limit Issues` — `44 mentions`
- `OpenClaw Setup Help: What People Get Stuck On` — `44 mentions`
- `OpenClaw for Sales Workflows` — `40 mentions`
- `OpenClaw + Browser Automation` — `29 mentions`
- `How to Stabilize a Flaky OpenClaw Setup` — `26 mentions`
- `OpenClaw + Slack Integration` — `25 mentions`
- `How to Run OpenClaw Locally` — `24 mentions`
- `OpenClaw for E-commerce Operations` — `24 mentions`
- `OpenClaw + Microsoft Teams / Azure Bot` — `21 mentions`
- `How to Fix OpenClaw Gateway and Connectivity Issues` — `20 mentions`
- `OpenClaw for Lead Generation / Prospecting` — `20 mentions`
- `OpenClaw for Real Estate Workflows` — `18 mentions`
- `How to Install OpenClaw on Windows / WSL / Ubuntu` — `16 mentions`
- `OpenClaw + SMS Workflows` — `15 mentions`
- `OpenClaw + Ollama / Local Models` — `14 mentions`

## Notes

- Counts overlap. One job can mention multiple topics.
- The counts above are topic-mention counts, not mutually exclusive job counts.
- The labeled CSV makes it possible to retrieve examples later for a specific topic or error type.
