import { requireDb } from "../db/client";
import { createTelegramPairingRepository } from "../db/repositories/telegram-pairings";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import type { Env } from "../types";

type PairTelegramInput = {
  tenantId?: string;
  pairingCode?: string;
};

export async function handleTelegramPairing(request: Request, env: Env): Promise<Response> {
  const db = requireDb(env);
  const pairings = createTelegramPairingRepository(db);
  const tenants = createTenantRepository(db);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId");
    if (!tenantId) {
      return json({ error: "tenantId is required" }, 400);
    }

    const pairing = await pairings.findLatestByTenant(tenantId);
    return json({
      paired: pairing?.status === "paired",
      pairedAt: pairing?.pairedAt ?? null,
      telegramUserId: pairing?.telegramUserId ?? null
    });
  }

  if (request.method !== "POST") {
    return methodNotAllowed("GET, POST");
  }

  const body = await parseJson<PairTelegramInput>(request);
  if (!body?.tenantId || !body.pairingCode) {
    return json({ error: "tenantId and pairingCode are required" }, 400);
  }

  const tenant = await tenants.findById(body.tenantId);
  if (!tenant) {
    return json({ error: "tenant not found" }, 404);
  }

  const normalizedCode = body.pairingCode.trim().toUpperCase();
  const pending = await pairings.findPendingByCode(normalizedCode);
  if (!pending) {
    return json({ error: "invalid pairing code" }, 400);
  }

  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    await pairings.expire(pending.id);
    return json({ error: "pairing code expired" }, 400);
  }

  await pairings.pairToTenant({ id: pending.id, tenantId: body.tenantId });
  return json({ ok: true });
}
