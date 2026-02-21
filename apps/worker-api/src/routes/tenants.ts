import type { Env } from "../types";
import { requireDb } from "../db/client";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import { ensureTenantOpenClawBootstrap } from "../services/openclaw-bootstrap";

type CreateTenantInput = {
  name?: string;
  email?: string;
};

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function handleTenants(
  request: Request,
  env: Env
): Promise<Response> {
  const tenants = createTenantRepository(requireDb(env));

  if (request.method === "GET") {
    const list = await tenants.list();
    return json({ tenants: list });
  }

  if (request.method !== "POST") {
    return methodNotAllowed("GET, POST");
  }

  const body = await parseJson<CreateTenantInput>(request);
  if (!body?.name || !body.email || !validEmail(body.email)) {
    return json({ error: "name and valid email are required" }, 400);
  }

  const created = await tenants.create({
    name: body.name,
    email: body.email
  });
  await ensureTenantOpenClawBootstrap(env, created.id);

  return json(created, 201);
}
