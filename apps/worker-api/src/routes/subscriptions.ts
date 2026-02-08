import type { Env } from "../types";
import { requireDb } from "../db/client";
import { createSubscriptionRepository } from "../db/repositories/subscriptions";
import { json, methodNotAllowed } from "../lib/http";

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
    const subscription = await subscriptions.findLatestByTenant(tenantId);

    return json({
        active: subscription?.status === "active",
        status: subscription?.status ?? "none",
        plan: subscription?.planCode ?? "none"
    });
}
