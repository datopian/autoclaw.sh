import { json } from "./lib/http";
import { processRunBatch } from "./queues/run-consumer";
import { requireDb } from "./db/client";
import { createRunRepository } from "./db/repositories/runs";
import { handleRuns } from "./routes/runs";
import { handleTemplates } from "./routes/templates";
import { handleTenants } from "./routes/tenants";
import { handleStripeWebhook } from "./routes/webhooks/stripe";
import { handleSubscriptions } from "./routes/subscriptions";
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
