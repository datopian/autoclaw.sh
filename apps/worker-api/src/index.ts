import { json } from "./lib/http";
import { processRunBatch } from "./queues/run-consumer";
import {
  processMemoryDistillBatch,
  processMemoryIngestBatch,
  type MemoryDistillQueueMessage,
  type MemoryIngestQueueMessage
} from "./queues/memory-consumer";
import { requireDb } from "./db/client";
import { createMemoryRepository } from "./db/repositories/memory";
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
import { createEmbeddingClient } from "./services/embeddings";
import type { RunQueueMessage } from "./services/run-orchestrator";
import type { Env } from "./types";

function isRunQueueMessage(value: unknown): value is RunQueueMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.runId === "string" &&
    typeof candidate.tenantId === "string" &&
    typeof candidate.templateId === "string"
  );
}

function isMemoryIngestQueueMessage(value: unknown): value is MemoryIngestQueueMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.tenantId === "string" &&
    typeof candidate.eventId === "string" &&
    typeof candidate.seq === "number" &&
    typeof candidate.eventTime === "string"
  );
}

function isMemoryDistillQueueMessage(value: unknown): value is MemoryDistillQueueMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.tenantId === "string" &&
    typeof candidate.scope === "string" &&
    typeof candidate.seqFrom === "number" &&
    typeof candidate.seqTo === "number"
  );
}

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
    if (batch.messages.length === 0) {
      return;
    }
    const firstBody = batch.messages[0].body as unknown;

    if (isRunQueueMessage(firstBody)) {
      const runs = createRunRepository(requireDb(env));
      const orchestrator = createRunOrchestrator({ env, runs });
      await processRunBatch(batch as MessageBatch<RunQueueMessage>, orchestrator);
      return;
    }

    if (isMemoryIngestQueueMessage(firstBody)) {
      const memory = createMemoryRepository(requireDb(env));
      const embedding = createEmbeddingClient(env);
      await processMemoryIngestBatch(
        batch as MessageBatch<MemoryIngestQueueMessage>,
        {
          memory,
          artifacts: env.ARTIFACTS,
          embeddingModel: embedding.model,
          embedText: embedding.embed
        }
      );
      return;
    }

    if (isMemoryDistillQueueMessage(firstBody)) {
      await processMemoryDistillBatch(batch as MessageBatch<MemoryDistillQueueMessage>);
      return;
    }

    // Unknown batch payload: ack safely so mixed-queue bootstrapping cannot jam consumers.
    for (const message of batch.messages) {
      message.ack();
    }
  }
};

export { AgentSession };
export default worker;
