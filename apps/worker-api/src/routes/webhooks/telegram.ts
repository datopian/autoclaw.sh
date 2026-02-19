import { requireDb } from "../../db/client";
import { createTelegramPairingRepository } from "../../db/repositories/telegram-pairings";
import { createTenantRepository } from "../../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../../lib/http";
import { invokeAIGateway } from "../../services/ai-gateway";
import { normalizeProvider, requireApiKey } from "../../services/secrets";
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

function extractGatewayText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean);
    const joined = textParts.join("\n").trim();
    return joined || null;
  }
  return null;
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
    const gatewayResponse = await invokeAIGateway({
      accountId: env.CF_ACCOUNT_ID,
      gatewayId: env.AI_GATEWAY_ID,
      baseUrl: env.AI_GATEWAY_BASE_URL,
      provider: normalizeProvider(tenant.modelProvider),
      model: tenant.modelId,
      apiKey: requireApiKey(tenant.byokApiKey),
      prompt: text
    });

    const reply = extractGatewayText(gatewayResponse) ?? "Processed. No text content returned.";
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: reply
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
