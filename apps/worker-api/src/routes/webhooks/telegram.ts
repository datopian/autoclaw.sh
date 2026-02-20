import { requireDb } from "../../db/client";
import { createMemoryRepository } from "../../db/repositories/memory";
import { createTelegramPairingRepository } from "../../db/repositories/telegram-pairings";
import { createTenantRepository } from "../../db/repositories/tenants";
import { createWorkspaceRepository } from "../../db/repositories/workspaces";
import { json, methodNotAllowed, parseJson } from "../../lib/http";
import { buildTenantPrompt } from "../../services/context-pack";
import type { Env } from "../../types";

type TelegramMessage = {
  chat?: { id?: number };
  from?: { id?: number };
  text?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

function generatePairingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < bytes.length; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

async function sendTelegramMessage(input: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`telegram send failed: ${response.status} ${body}`);
  }
}

function buildMemoryObjectKey(input: { tenantId: string; eventId: string; at: Date }): string {
  const yyyy = String(input.at.getUTCFullYear());
  const mm = String(input.at.getUTCMonth() + 1).padStart(2, "0");
  return `tenant/${input.tenantId}/memory/raw/${yyyy}/${mm}/${input.eventId}.json`;
}

export async function handleTelegramWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ error: "telegram bot token not configured" }, 503);
  }

  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ error: "invalid telegram webhook secret" }, 401);
    }
  }

  const update = await parseJson<TelegramUpdate>(request);
  const message = update?.message;
  const text = message?.text?.trim();
  if (!text) {
    return json({ ok: true });
  }
  if (!message) {
    return json({ ok: true });
  }

  const chatId = message.chat?.id;
  const userId = message.from?.id;
  if (!chatId || !userId) {
    return json({ ok: true });
  }

  const db = requireDb(env);
  const pairings = createTelegramPairingRepository(db);
  const tenants = createTenantRepository(db);
  const workspaces = createWorkspaceRepository(db);
  const memory = createMemoryRepository(db);
  const lower = text.toLowerCase();

  if (lower === "/start") {
    const pairingCode = generatePairingCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await pairings.createPending({
      telegramUserId: String(userId),
      telegramChatId: String(chatId),
      pairingCode,
      expiresAt
    });

    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: `OpenClaw pairing code: ${pairingCode}\nPaste this code in Step 2 on the OpenClaw dashboard. This code expires in 15 minutes.`
    });
    return json({ ok: true });
  }

  const pairing = await pairings.findPairedByTelegramUserId(String(userId));
  if (!pairing?.tenantId) {
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: "Your account is not paired yet. Open the OpenClaw dashboard, complete Step 2, then try again."
    });
    return json({ ok: true });
  }

  const tenant = await tenants.findById(pairing.tenantId);
  if (!tenant?.byokApiKey || !tenant.modelProvider || !tenant.modelId) {
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: "Your agent is not fully configured yet. Add model provider, model, and API key in Step 2, then retry."
    });
    return json({ ok: true });
  }

  if (!env.CF_ACCOUNT_ID || !env.AI_GATEWAY_ID) {
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: "OpenClaw backend is not fully configured for model routing. Please contact support."
    });
    return json({ ok: true });
  }

  try {
    const workspace = await workspaces.ensureForTenant({ tenantId: pairing.tenantId });
    const promptRecord = await workspaces.getPrompt(workspace.id);
    let systemPrompt: string | null = null;
    if (promptRecord?.system_prompt_r2_key) {
      const object = await env.ARTIFACTS.get(promptRecord.system_prompt_r2_key);
      if (object) {
        systemPrompt = await object.text();
      }
    }
    const profiles = await memory.listProfiles(pairing.tenantId, 8);
    const prompt = buildTenantPrompt({
      userMessage: text,
      systemPrompt,
      profiles
    });

    const sessionId = env.AGENT_SESSION.idFromName(`${pairing.tenantId}:telegram`);
    const session = env.AGENT_SESSION.get(sessionId);
    const sessionResponse = await session.fetch("https://agent-session/v1/telegram/reply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenantId: pairing.tenantId,
        telegramUserId: String(userId),
        prompt,
        modelProvider: tenant.modelProvider,
        modelId: tenant.modelId,
        byokApiKey: tenant.byokApiKey
      })
    });
    if (!sessionResponse.ok) {
      const body = await sessionResponse.text();
      throw new Error(`agent session failed: ${body || sessionResponse.status}`);
    }
    const sessionPayload = (await sessionResponse.json()) as { reply?: string };
    const reply = (sessionPayload.reply ?? "").trim() || "Processed. No text content returned.";
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: reply
    });

    const now = new Date();
    const userEventId = crypto.randomUUID();
    const userObjectKey = buildMemoryObjectKey({
      tenantId: pairing.tenantId,
      eventId: userEventId,
      at: now
    });
    await env.ARTIFACTS.put(
      userObjectKey,
      JSON.stringify(
        {
          eventId: userEventId,
          tenantId: pairing.tenantId,
          telegramUserId: String(userId),
          telegramChatId: String(chatId),
          role: "user",
          text,
          createdAt: now.toISOString()
        },
        null,
        2
      ),
      { httpMetadata: { contentType: "application/json" } }
    );
    const userEvent = await memory.appendEvent({
      tenantId: pairing.tenantId,
      role: "user",
      contentR2Key: userObjectKey,
      redactionVersion: "v1"
    });
    await env.MEMORY_INGEST_QUEUE.send({
      tenantId: pairing.tenantId,
      eventId: userEvent.id,
      seq: userEvent.seq,
      eventTime: userEvent.createdAt
    });

    const assistantEventId = crypto.randomUUID();
    const assistantObjectKey = buildMemoryObjectKey({
      tenantId: pairing.tenantId,
      eventId: assistantEventId,
      at: now
    });
    await env.ARTIFACTS.put(
      assistantObjectKey,
      JSON.stringify(
        {
          eventId: assistantEventId,
          tenantId: pairing.tenantId,
          telegramUserId: String(userId),
          telegramChatId: String(chatId),
          role: "assistant",
          text: reply,
          createdAt: now.toISOString()
        },
        null,
        2
      ),
      { httpMetadata: { contentType: "application/json" } }
    );
    const assistantEvent = await memory.appendEvent({
      tenantId: pairing.tenantId,
      role: "assistant",
      contentR2Key: assistantObjectKey,
      redactionVersion: "v1"
    });
    await env.MEMORY_INGEST_QUEUE.send({
      tenantId: pairing.tenantId,
      eventId: assistantEvent.id,
      seq: assistantEvent.seq,
      eventTime: assistantEvent.createdAt
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: `I couldn't process that yet: ${reason}`
    });
  }

  return json({ ok: true });
}
