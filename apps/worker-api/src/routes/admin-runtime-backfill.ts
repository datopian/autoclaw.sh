import { requireDb } from "../db/client";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import { ensureTenantOpenClawBootstrap } from "../services/openclaw-bootstrap";
import type { Env } from "../types";

type BackfillInput = {
  limit?: number;
};

type BackfillResult = {
  tenantId: string;
  ok: boolean;
  reason?: string;
  error?: string;
};

export async function handleAdminRuntimeBackfill(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const expectedToken = env.RUNTIME_BACKFILL_TOKEN?.trim();
  if (!expectedToken) {
    return json({ error: "runtime backfill token is not configured" }, 503);
  }

  const providedToken = request.headers.get("x-admin-token")?.trim();
  if (!providedToken || providedToken !== expectedToken) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = await parseJson<BackfillInput>(request);
  const rawLimit = body?.limit;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(500, Math.floor(rawLimit)))
      : 500;

  const tenants = createTenantRepository(requireDb(env));
  const allTenants = await tenants.list();
  const selectedTenants = allTenants.slice(0, limit);

  const results: BackfillResult[] = [];
  for (const tenant of selectedTenants) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await ensureTenantOpenClawBootstrap(env, tenant.id);
      results.push({
        tenantId: tenant.id,
        ok: true,
        reason: "workspace defaults ensured"
      });
    } catch (error) {
      results.push({
        tenantId: tenant.id,
        ok: false,
        error: error instanceof Error ? error.message : "unknown error"
      });
    }
  }

  const success = results.filter((item) => item.ok).length;
  const failed = results.length - success;
  return json({
    ok: failed === 0,
    totalTenants: allTenants.length,
    processed: results.length,
    success,
    failed,
    results
  });
}
