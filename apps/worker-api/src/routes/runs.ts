import type { Env } from "../types";
import { requireDb } from "../db/client";
import { createRunRepository } from "../db/repositories/runs";
import { createSubscriptionRepository } from "../db/repositories/subscriptions";
import { json, methodNotAllowed, parseJson } from "../lib/http";

type RunInput = {
  tenantId?: string;
  templateId?: string;
  modelProvider?: string;
  modelId?: string;
  byokApiKey?: string;
  prompt?: string;
};

export async function handleRuns(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const body = await parseJson<RunInput>(request);
  if (!body?.tenantId || !body.templateId) {
    return json({ error: "tenantId and templateId are required" }, 400);
  }
  if (!env.RUN_QUEUE) {
    return json({ error: "run queue is not configured" }, 500);
  }

  const runId = crypto.randomUUID();
  const db = requireDb(env);
  const subscriptions = createSubscriptionRepository(db);
  const subscription = await subscriptions.findLatestByTenant(body.tenantId);
  if (!subscription || subscription.status !== "active") {
    return json(
      {
        error: "active subscription required",
        code: "subscription_inactive"
      },
      402
    );
  }

  const runs = createRunRepository(db);

  await runs.createQueued({
    runId,
    tenantId: body.tenantId,
    templateId: body.templateId
  });

  await env.RUN_QUEUE.send({
    runId,
    tenantId: body.tenantId,
    templateId: body.templateId,
    byok: body.byokApiKey
      ? {
          provider: body.modelProvider,
          model: body.modelId,
          apiKey: body.byokApiKey,
          prompt: body.prompt
        }
      : undefined,
    queuedAt: new Date().toISOString()
  });

  return json({ runId, status: "queued" }, 202);
}
