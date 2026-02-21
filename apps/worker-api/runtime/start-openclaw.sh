#!/bin/bash
set -euo pipefail

GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"

mkdir -p /root/.openclaw /root/clawd

if [ ! -f /root/.openclaw/openclaw.json ]; then
  AUTH_ARGS=()
  if [ -n "${OPENAI_API_KEY:-}" ]; then
    AUTH_ARGS=(--auth-choice openai-api-key --openai-api-key "$OPENAI_API_KEY")
  elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    AUTH_ARGS=(--auth-choice apiKey --anthropic-api-key "$ANTHROPIC_API_KEY")
  fi

  openclaw onboard --non-interactive --accept-risk \
    --mode local \
    --gateway-port "$GATEWAY_PORT" \
    --gateway-bind lan \
    --skip-channels \
    --skip-skills \
    --skip-health \
    "${AUTH_ARGS[@]}" || { echo "openclaw onboard failed; continuing"; true; }
fi

if [ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
  exec openclaw gateway --port "$GATEWAY_PORT" --bind lan --allow-unconfigured --token "$OPENCLAW_GATEWAY_TOKEN"
fi

exec openclaw gateway --port "$GATEWAY_PORT" --bind lan --allow-unconfigured
