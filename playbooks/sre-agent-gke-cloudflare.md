---
title: "Playbook: Deploying an Autonomous SRE Agent for GKE on Cloudflare"
description: "Step-by-step guide to deploying a Cloudflare Workers-based SRE incident investigation agent that connects to a private GKE cluster and notifies via Google Chat."
date: 2026-04-10
---

> **Note:** This playbook is published on autoclaw.sh, which is primarily focused on OpenClaw. This guide covers a separate project — an SRE agent for Kubernetes infrastructure. We've published it here as a practical reference for teams running similar stacks.

---

## Overview

This playbook walks through deploying an autonomous SRE incident investigation agent. The agent:

- Receives down alerts from Uptime Kuma via webhook
- Runs an autonomous investigation loop against a GKE cluster using an LLM with Kubernetes tool access
- Posts threaded findings to Google Chat

**Stack:** Cloudflare Workers + Durable Objects + Queues + KV + Workers AI (Gemma 4) + GKE + Uptime Kuma + Google Chat

---

## Prerequisites

- Cloudflare account with Workers paid plan (Durable Objects requires it)
- GKE cluster with kubectl access
- Uptime Kuma instance with at least one monitor configured
- Google Chat space with incoming webhook configured
- Node.js 18+ and `npx wrangler` available locally
- A domain managed in Cloudflare DNS

---

## Part 1 — GKE: Create a read-only ServiceAccount

Create a ServiceAccount with cluster-wide read permissions (no write, no secrets access).

```yaml
# sre-agent-rbac.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sre-agent-ns
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sre-agent
  namespace: sre-agent-ns
---
apiVersion: v1
kind: Secret
metadata:
  name: sre-agent-token
  namespace: sre-agent-ns
  annotations:
    kubernetes.io/service-account.name: sre-agent
type: kubernetes.io/service-account-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sre-agent-reader
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods", "pods/log", "events", "nodes", "services"]
    verbs: ["get", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sre-agent-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sre-agent-reader
subjects:
  - kind: ServiceAccount
    name: sre-agent
    namespace: sre-agent-ns
```

Apply it:

```bash
kubectl apply -f sre-agent-rbac.yaml
```

Extract the bearer token:

```bash
kubectl get secret sre-agent-token -n sre-agent-ns \
  -o jsonpath='{.data.token}' | base64 -d
```

Save this token — you'll use it as `KUBECONFIG_TOKEN`.

Get your GKE master endpoint:

```bash
kubectl cluster-info
# Kubernetes control plane is running at https://<IP_OR_HOSTNAME>
```

---

## Part 2 — Cloudflare DNS: expose the GKE API

The GKE master endpoint is on the public internet but addressed by IP. Cloudflare Workers require a hostname. Create a DNS record on your domain:

| Field | Value |
|---|---|
| Type | A |
| Name | `gke-api` |
| IPv4 | `<GKE master IP>` |
| Proxy | **Proxied (orange cloud)** |

Then add a Page Rule:

- URL: `gke-api.yourdomain.com/*`
- Setting: **SSL → Full**

This lets Cloudflare proxy requests to the GKE API without strict certificate verification (GKE's cert is for its IP, not your subdomain).

> The record should be **proxied**, not DNS-only. DNS-only would expose the GKE IP directly and cause TLS errors from Workers.

---

## Part 3 — Cloudflare: Create infrastructure

Create the required Cloudflare resources:

```bash
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>

# KV namespace for deduplication
npx wrangler kv namespace create DEDUPE_KV

# Queues
npx wrangler queues create sre-incident-queue
npx wrangler queues create sre-incident-dlq
```

Note the KV namespace ID from the output — you'll need it in `wrangler.toml`.

---

## Part 4 — Worker: configure wrangler.toml

```toml
name = "sre-incident-agent"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
account_id = "<your-cloudflare-account-id>"

[observability]
enabled = true
head_sampling_rate = 1

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "INCIDENT_DO"
class_name = "IncidentDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["IncidentDO"]

[[queues.producers]]
binding = "INCIDENT_QUEUE"
queue = "sre-incident-queue"

[[queues.consumers]]
queue = "sre-incident-queue"
max_batch_size = 5
max_batch_timeout = 2
max_retries = 3
dead_letter_queue = "sre-incident-dlq"

[[kv_namespaces]]
binding = "DEDUPE_KV"
id = "<kv-namespace-id-from-step-3>"

[vars]
ENVIRONMENT = "production"
GKE_API_SERVER = "https://gke-api.yourdomain.com"
LLM_MODEL = "@cf/google/gemma-4-26b-a4b-it"
```

---

## Part 5 — Worker: set secrets

```bash
# GKE ServiceAccount bearer token (from Part 1)
npx wrangler secret put KUBECONFIG_TOKEN

# Google Chat incoming webhook URL
npx wrangler secret put GOOGLE_CHAT_WEBHOOK_URL

# Uptime Kuma webhook bearer token (choose any string, use same value in Kuma)
npx wrangler secret put UPTIME_KUMA_SECRET
```

---

## Part 6 — Worker: deploy

```bash
npm install
npx wrangler deploy
```

Verify it's live:

```bash
curl https://sre-incident-agent.<your-subdomain>.workers.dev/health
# {"ok":true,"environment":"production"}
```

Test K8s connectivity (also sends first 10 namespaces to Google Chat):

```bash
curl https://sre-incident-agent.<your-subdomain>.workers.dev/test/k8s
# {"ok":true,"message":"Connected to GKE. Found N namespaces..."}
```

---

## Part 7 — Uptime Kuma: configure notification

In Uptime Kuma → **Notifications** → **Add Notification**:

| Field | Value |
|---|---|
| Type | Webhook |
| Name | SRE Agent |
| URL | `https://sre-incident-agent.<subdomain>.workers.dev/webhook/uptime-kuma` |
| Method | POST |
| Content Type | `application/json` |
| Additional Headers | `{"Authorization": "Bearer <your-UPTIME_KUMA_SECRET>"}` |

Hit **Test** — you should see "Test ping acknowledged" (200 OK). Uptime Kuma test pings send `heartbeat: null` which the agent handles gracefully without triggering an investigation.

Assign this notification to whichever monitors you want covered.

---

## Part 8 — Verify end-to-end

Trigger a fake down event:

```bash
curl -X POST https://sre-incident-agent.<subdomain>.workers.dev/webhook/uptime-kuma \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-secret>" \
  -d '{
    "heartbeat": {"status": 0, "time": "2026-01-01T00:00:00Z", "msg": "Test"},
    "monitor": {"id": 1, "name": "my-service", "url": "https://my-service.example.com"},
    "msg": "Test incident"
  }'
```

Check Google Chat — you should see a thread appear with:
1. Alert received notification
2. Investigation step notifications as tool calls fire
3. A final card with root cause, recommended action, and confidence level

Check the incident state:

```bash
curl https://sre-incident-agent.<subdomain>.workers.dev/incidents/<incidentId>
```

---

## Architecture reference

```
Uptime Kuma
    │  POST /webhook/uptime-kuma
    ▼
Cloudflare Worker (sre-incident-agent)
    │  verify bearer token
    │  deduplicate (KV)
    │  notify Google Chat: "received"
    │  enqueue (Workers Queue)
    ▼
Queue Consumer (same Worker)
    │  dispatch to Durable Object by incidentId
    ▼
IncidentDO (Durable Object)
    │  POST /start → schedule alarm
    ▼
alarm() loop [up to 20 turns, 3s between alarms]
    │
    ├── Gemma 4 (Workers AI)
    │       calls tools: list_pods, get_deployment_status,
    │                     get_recent_events, get_pod_logs,
    │                     get_rollout_status, get_node_readiness
    │
    ├── KubeHttpClient
    │       → https://gke-api.yourdomain.com  (Cloudflare proxy)
    │       → GKE master endpoint             (Full SSL, bearer token)
    │
    └── Google Chat webhook (threaded by incidentId)
            "investigation step N"
            "complete: root cause + recommended action"
```

---

## Security notes

- The ServiceAccount is strictly read-only — no write access, no access to Secrets
- The webhook endpoint validates a bearer token on every request
- The GKE endpoint is protected by the ServiceAccount token even when DNS-proxied through Cloudflare
- Secrets are stored as Cloudflare Worker secrets (encrypted at rest, not in wrangler.toml)
- The deduplication KV prevents the same alert from triggering multiple investigations

---

## Tuning

| Parameter | Location | Default | Notes |
|---|---|---|---|
| Max tool calls | `loop.ts` `MAX_TURNS` | 20 | Increase for complex clusters |
| Alarm interval | `IncidentDO.ts` | 3s | Rate limit buffer for Workers AI |
| Queue batch size | `wrangler.toml` | 5 | Max concurrent incidents processed |
| Queue retries | `wrangler.toml` | 3 | Before DLQ |
| LLM model | `wrangler.toml` `LLM_MODEL` | `@cf/google/gemma-4-26b-a4b-it` | Any Workers AI model with tool calling |
