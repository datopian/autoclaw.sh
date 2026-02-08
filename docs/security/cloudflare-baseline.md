# Cloudflare Security Baseline (V1)

## Objective
Define minimum security controls for Cloudflare-hosted OpenClaw AaaS before broader pilot expansion.

## Identity and Access
- Enforce least privilege for Cloudflare account roles.
- Restrict production operations through Cloudflare Access.
- Use separate environments for dev/staging/prod Worker deployments.

## Secrets Management
- Store operational secrets in Wrangler secrets.
- Do not store API keys in source code, D1 tables, or logs.
- Rotate Stripe and operational secrets after incidents and on schedule.

## Network and Edge Controls
- Enable Cloudflare WAF protections for public API endpoints.
- Apply rate limiting for intake routes (`/api/runs`, `/api/tenants`).
- Restrict admin endpoints to Access-authenticated identities only.

## Data Protection
- D1: store only required tenant/run metadata.
- R2: store artifacts with scoped access and signed URL expiration.
- Encrypt sensitive payload paths in transit and avoid plaintext key persistence.

## Monitoring and Audit
- Centralize worker, queue, and DO logs with retention policy.
- Record operator actions and tenant-affecting admin events.
- Alert on abnormal failure rates, auth anomalies, and queue backlog spikes.

## SDLC Controls
- Require review for infrastructure/configuration changes.
- Run static checks and tests before deploy (once dependency install is available).
- Maintain incident runbooks and execute periodic response drills.

## Known Gaps (Current State)
- Real Stripe signature verification is placeholder-only.
- Automated secret rotation is not yet implemented.
- Fine-grained RBAC audit tooling is not yet implemented.

## Minimum Go-Live Checklist
1. Bind production D1, Queue, DO, and R2 resources with least privilege.
2. Set all required secrets and verify no plaintext leakage in logs.
3. Enable rate limiting and Access policies on admin surfaces.
4. Validate incident alerts and runbook execution path.
