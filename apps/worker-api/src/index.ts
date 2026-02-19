import { json } from "./lib/http";
import { processRunBatch } from "./queues/run-consumer";
import { requireDb } from "./db/client";
import { createRunRepository } from "./db/repositories/runs";
import { handleRuns } from "./routes/runs";
import { handleTemplates } from "./routes/templates";
import { handleTenants } from "./routes/tenants";
import { handleAccountsStart, handleAccountsVerify } from "./routes/accounts";
import {
  handleAuthLogout,
  handleAuthMe,
  handleAuthStart,
  handleAuthVerify
} from "./routes/auth";
import { handleStripeWebhook } from "./routes/webhooks/stripe";
import { handleTelegramWebhook } from "./routes/webhooks/telegram";
import { handleSubscriptions } from "./routes/subscriptions";
import { handleTelegramPairing } from "./routes/telegram-pairing";
import { handleTenantAgentConfig } from "./routes/tenant-agent-config";
import { AgentSession } from "./durable/agent-session";
import { createRunOrchestrator } from "./services/run-orchestrator";
import type { RunQueueMessage } from "./services/run-orchestrator";
import type { Env } from "./types";

const worker: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return json({ ok: true, service: "worker-api" });
    }

    if (url.pathname === "/api/tenants") {
      return handleTenants(request, env);
    }

    if (url.pathname === "/api/accounts/start") {
      return handleAccountsStart(request, env);
    }

    if (url.pathname === "/api/accounts/verify") {
      return handleAccountsVerify(request, env);
    }

    if (url.pathname === "/api/auth/start") {
      return handleAuthStart(request, env);
    }

    if (url.pathname === "/api/auth/verify") {
      return handleAuthVerify(request, env);
    }

    if (url.pathname === "/api/auth/me") {
      return handleAuthMe(request, env);
    }

    if (url.pathname === "/api/auth/logout") {
      return handleAuthLogout(request, env);
    }

    if (url.pathname === "/api/templates") {
      return handleTemplates(request);
    }

    if (url.pathname === "/api/runs") {
      return handleRuns(request, env);
    }

    if (url.pathname === "/api/webhooks/stripe") {
      return handleStripeWebhook(request, env);
    }

    if (url.pathname === "/api/subscriptions") {
      return handleSubscriptions(request, env);
    }

    if (url.pathname === "/api/telegram/pairing") {
      return handleTelegramPairing(request, env);
    }

    if (url.pathname === "/api/tenants/agent-config") {
      return handleTenantAgentConfig(request, env);
    }

    if (url.pathname === "/api/webhooks/telegram") {
      return handleTelegramWebhook(request, env);
    }

    return json({ error: "Not found" }, 404);
  },

  async queue(batch, env) {
    const runs = createRunRepository(requireDb(env));
    const orchestrator = createRunOrchestrator({ env, runs });
    await processRunBatch(batch as MessageBatch<RunQueueMessage>, orchestrator);
  }
};

export { AgentSession };
export default worker;
