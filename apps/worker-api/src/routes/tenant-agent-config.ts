import { requireDb } from "../db/client";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import { ensureTenantOpenClawBootstrap } from "../services/openclaw-bootstrap";
import { normalizeProvider, requireApiKey } from "../services/secrets";
import type { Env } from "../types";

type UpdateTenantAgentConfigInput = {
  tenantId?: string;
  modelProvider?: string;
  modelId?: string;
  byokApiKey?: string;
};

export async function handleTenantAgentConfig(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const body = await parseJson<UpdateTenantAgentConfigInput>(request);
  if (!body?.tenantId || !body.modelProvider || !body.modelId || !body.byokApiKey) {
    return json(
      { error: "tenantId, modelProvider, modelId, and byokApiKey are required" },
      400
    );
  }

  const provider = normalizeProvider(body.modelProvider);
  const apiKey = requireApiKey(body.byokApiKey);

  const tenants = createTenantRepository(requireDb(env));
  const tenant = await tenants.findById(body.tenantId);
  if (!tenant) {
    return json({ error: "tenant not found" }, 404);
  }

  await tenants.updateAgentConfig({
    tenantId: body.tenantId,
    modelProvider: provider,
    modelId: body.modelId.trim(),
    byokApiKey: apiKey
  });

  await ensureTenantOpenClawBootstrap(env, body.tenantId);
  return json({
    ok: true,
    runtime: {
      started: false,
      reason: "startup deferred until first Telegram message"
    }
  });
}
