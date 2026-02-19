import type { Env } from "../types";
import { requireDb } from "../db/client";
import { createRunRepository } from "../db/repositories/runs";
import { createSubscriptionRepository } from "../db/repositories/subscriptions";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";

type RunInput = {
  tenantId?: string;
  templateId?: string;
  modelProvider?: string;
  modelId?: string;
  byokApiKey?: string;
  prompt?: string;
};

const TRIAL_PERIOD_MS = 48 * 60 * 60 * 1000;

function tenantTrialEndsAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + TRIAL_PERIOD_MS).toISOString();
}

function isTrialActive(createdAt: string, now: Date): boolean {
  return new Date(tenantTrialEndsAt(createdAt)).getTime() > now.getTime();
}

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
  const tenants = createTenantRepository(db);
  const subscriptions = createSubscriptionRepository(db);
  const [tenant, subscription] = await Promise.all([
    tenants.findById(body.tenantId),
    subscriptions.findLatestByTenant(body.tenantId)
  ]);

  if (!tenant) {
    return json({ error: "tenant not found", code: "tenant_missing" }, 404);
  }

  const now = new Date();
  const trialActive = isTrialActive(tenant.createdAt, now);
  const paidActive = subscription?.status === "active";
  if (!trialActive && !paidActive) {
    return json(
      {
        error: "active subscription required",
        code: "subscription_inactive",
        trialEndsAt: tenantTrialEndsAt(tenant.createdAt)
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
