# OpenClaw AaaS Launch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch a profitable Agent-as-a-Service offering where solo builders can deploy and run managed OpenClaw agents on Hetzner with strong isolation, simple onboarding, and recurring subscriptions.

**Architecture:** Start with a control-plane web app that provisions one isolated tenant environment per customer on Hetzner. Each tenant runs template-based OpenClaw agents behind a managed runtime with logging, monitoring, secrets, and backups. Keep onboarding manual in v1 to control quality and reduce engineering scope, then progressively automate provisioning and lifecycle operations.

**Tech Stack:** Next.js (marketing + dashboard), Postgres (tenant/billing metadata), Redis (jobs), worker service (provisioning/orchestration), Terraform + Hetzner Cloud API, Docker, Caddy/Traefik, Stripe Billing, Grafana + Loki + Prometheus, Sentry, GitHub Actions.

## Product Scope (V1)

### In Scope
- Segment 1 first: solo builders / indie hackers.
- Offer: DIY + managed infrastructure (user brings model/API keys and prompt logic).
- Agent setup: template-based catalog (3 initial templates).
- Tenancy: single-tenant per customer (isolated VM stack).
- GTM: waitlist + manual onboarding + Stripe subscriptions.

### Out of Scope (V1)
- Enterprise SSO/SAML.
- Shared multi-tenant execution.
- Complex no-code flow builder.
- SLA-backed 24/7 support.

## Commercial Model

### Packaging
- `Starter` ($49-$99/mo): 1 environment, 1-2 agents, capped runs.
- `Builder` ($149-$299/mo): more runs, priority support, advanced monitoring.
- `Pro` ($499+/mo): larger VM profiles, optional advisory hours.

### Unit Economics Targets
- Gross margin target: >= 65% by end of month 3.
- Infra + observability COGS target: <= 30% of revenue.
- Support time target: <= 90 min/customer/month by month 3.

### Pricing Validation Steps
1. Start with 10 pilot customers at discounted annual or month-to-month pricing.
2. Track real COGS per tenant (compute, storage, bandwidth, support time).
3. Re-price after 4 weeks if gross margin is below target.

## System Design

### Control Plane
- Customer waitlist and onboarding status.
- Tenant records (plan, region, resources, endpoints, status).
- Template selection and runtime config capture.
- Stripe subscription state and entitlement checks.

### Provisioning Plane
- Job queue for create/update/suspend/delete tenant environment.
- Idempotent Terraform modules per tenant.
- Post-provision bootstrap scripts for OpenClaw runtime.
- Health checks and rollback on failed provisioning.

### Tenant Runtime (Per Customer)
- Dedicated Hetzner VM or small VM group.
- Dockerized OpenClaw runtime + template pack.
- Encrypted secret storage and runtime injection.
- Log + metrics forwarding to shared observability stack.

### Security Baseline
- Network isolation and least-privilege firewall rules.
- Per-tenant service credentials.
- Audit log for operator actions.
- Backup policy (daily snapshots + retention).

## 30/60/90 Day Execution

### Day 0-30: Foundation + Pilot Readiness
1. Define ICP and value proposition copy for landing page.
2. Build landing page with waitlist capture and analytics.
3. Implement operator-only onboarding dashboard.
4. Set up Stripe products/plans and webhook handling.
5. Build initial provisioning worker + Hetzner API integration.
6. Create Terraform module for single-tenant environment.
7. Ship first template pack (support/research/ops templates).
8. Add baseline observability (logs, metrics, error tracking).
9. Run internal dogfooding with 2-3 fake tenants.
10. Onboard first 3 pilot users manually.

### Day 31-60: Reliability + Repeatable Operations
1. Add provisioning retries, rollback, and status timelines.
2. Build customer dashboard (status, usage, billing, logs summary).
3. Add run quotas and entitlement enforcement.
4. Add backup/restore playbooks and disaster recovery checks.
5. Add incident response runbooks and alert routing.
6. Expand to 10-15 pilot customers.
7. Instrument funnel metrics (visit -> waitlist -> onboard -> retained).
8. Refine pricing and packaging from pilot data.

### Day 61-90: Growth + Segment Expansion Prep
1. Reduce manual onboarding steps with guided self-serve flow.
2. Add lightweight template customization UX.
3. Improve docs + in-app onboarding for time-to-first-agent.
4. Add optional agency-oriented plan features (multi-project view).
5. Validate first 3-5 agency customers (segment 2).
6. Publish reliability and security baseline page.
7. Prepare enterprise gap list (SSO, compliance controls, contracts).

## Build Backlog (Technical)

### Task 1: Marketing + Waitlist
**Files:**
- Create: `apps/web` (Next.js app)
- Create: `apps/web/pages/index.tsx`
- Create: `apps/web/pages/waitlist.tsx`
- Create: `apps/web/lib/analytics.ts`
- Create: `apps/web/lib/api/waitlist.ts`

### Task 2: Control Plane API
**Files:**
- Create: `apps/control-api`
- Create: `apps/control-api/src/routes/tenants.ts`
- Create: `apps/control-api/src/routes/billing.ts`
- Create: `apps/control-api/src/routes/templates.ts`
- Create: `apps/control-api/src/db/schema.sql`

### Task 3: Provisioning Worker
**Files:**
- Create: `apps/provisioner/src/jobs/create-tenant.ts`
- Create: `apps/provisioner/src/jobs/delete-tenant.ts`
- Create: `apps/provisioner/src/lib/hetzner.ts`
- Create: `apps/provisioner/src/lib/terraform.ts`

### Task 4: Terraform Modules
**Files:**
- Create: `infra/terraform/modules/tenant-runtime/main.tf`
- Create: `infra/terraform/modules/network/main.tf`
- Create: `infra/terraform/environments/pilot/main.tf`

### Task 5: Runtime Template Pack
**Files:**
- Create: `runtime/templates/support-agent.yaml`
- Create: `runtime/templates/research-agent.yaml`
- Create: `runtime/templates/ops-agent.yaml`
- Create: `runtime/bootstrap/install-openclaw.sh`

### Task 6: Billing and Entitlements
**Files:**
- Create: `apps/control-api/src/integrations/stripe.ts`
- Create: `apps/control-api/src/services/entitlements.ts`
- Create: `apps/control-api/src/routes/webhooks/stripe.ts`

### Task 7: Observability + Ops
**Files:**
- Create: `infra/monitoring/prometheus.yml`
- Create: `infra/monitoring/loki-config.yml`
- Create: `infra/monitoring/grafana-dashboards/tenant-overview.json`
- Create: `docs/runbooks/incidents.md`
- Create: `docs/runbooks/provisioning-failures.md`

### Task 8: Security + Trust
**Files:**
- Create: `docs/security/baseline.md`
- Create: `docs/security/data-handling.md`
- Create: `docs/security/backup-policy.md`

## KPI Dashboard (Weekly)
- Waitlist conversion rate.
- Time from payment to active tenant.
- Time to first successful agent run.
- Gross margin per active customer.
- 30-day retention and churn reason distribution.
- Support hours per customer.
- Provisioning failure rate.

## Risks and Mitigations
- Risk: Hetzner API or regional capacity issues.
- Mitigation: multi-region fallback and pre-warmed base images.

- Risk: High support load from template confusion.
- Mitigation: constrain v1 template options and improve guided setup.

- Risk: Low margins from underpriced plans.
- Mitigation: weekly COGS tracking and explicit re-pricing trigger.

- Risk: Security incident in tenant runtime.
- Mitigation: strict network policies, secrets rotation, audit logs, runbooks.

## Immediate Next Actions (This Week)
1. Publish a one-page landing site with waitlist and 3 template use cases.
2. Implement manual onboarding workflow + Stripe subscription setup.
3. Build tenant provisioning MVP on Hetzner for one template.
4. Onboard first 2 pilot users and capture detailed setup friction notes.

