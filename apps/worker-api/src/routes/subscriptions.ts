import type { Env } from "../types";
import { requireDb } from "../db/client";
import { createSubscriptionRepository } from "../db/repositories/subscriptions";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed } from "../lib/http";

const TRIAL_PERIOD_MS = 48 * 60 * 60 * 1000;

function tenantTrialEndsAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + TRIAL_PERIOD_MS).toISOString();
}

export async function handleSubscriptions(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  if (!tenantId) {
    return json({ error: "tenantId is required" }, 400);
  }

  const db = requireDb(env);
  const subscriptions = createSubscriptionRepository(db);
  const tenants = createTenantRepository(db);
  const [subscription, tenant] = await Promise.all([
    subscriptions.findLatestByTenant(tenantId),
    tenants.findById(tenantId)
  ]);

  if (!tenant) {
    return json({ error: "tenant not found" }, 404);
  }

  const trialEndsAt = tenantTrialEndsAt(tenant.createdAt);
  const trialRemainingMs = Math.max(0, new Date(trialEndsAt).getTime() - Date.now());
  const trialActive = trialRemainingMs > 0;
  const paidActive = subscription?.status === "active";

  return json({
    active: paidActive || trialActive,
    paidActive,
    trialActive,
    trialEndsAt,
    trialRemainingMs,
    status: subscription?.status ?? "none",
    plan: subscription?.planCode ?? "trial"
  });
}
