# BYOK Policy (V1)

## Scope
This policy defines how OpenClaw AaaS handles customer-provided model API keys (BYOK) for Cloudflare-based agent execution.

## Rules
- BYOK keys must be supplied by the customer and are never reused across tenants.
- BYOK keys are never persisted in D1 tables or application logs.
- BYOK keys are only used in-memory for outbound AI Gateway requests.
- BYOK keys must be redacted before any diagnostic output.
- Failed model calls must not echo provider keys in error payloads.

## Data Flow Constraints
- Request intake may include BYOK key material only for immediate run dispatch.
- Queue payloads containing key material are treated as transient operational data and should be minimized.
- Long-term storage for BYOK keys requires a dedicated encrypted secret vault path before GA.

## Operational Controls
- Access to Wrangler secrets and production bindings is restricted to operators.
- Stripe and BYOK secrets must be rotated on incident response triggers.
- Audit events should record key usage by tenant and provider without storing raw key values.

## Current V1 Gaps
- Per-tenant encrypted secret storage is not yet implemented.
- Automated key rotation is not yet implemented.
- Fine-grained RBAC for operator key access is not yet implemented.

## Required Before GA
- Implement encrypted at-rest BYOK storage with scoped decryption.
- Add key provenance and rotation metadata.
- Add automated leak detection patterns in logs and traces.
