import { requireDb } from "../../db/client";
import { createTelegramPairingRepository } from "../../db/repositories/telegram-pairings";
import { json, methodNotAllowed, parseJson } from "../../lib/http";
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
  await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text
    })
  });
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
  if (!message?.text || message.text.trim().toLowerCase() !== "/start") {
    return json({ ok: true });
  }

  const chatId = message.chat?.id;
  const userId = message.from?.id;
  if (!chatId || !userId) {
    return json({ ok: true });
  }

  const pairingCode = generatePairingCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const pairings = createTelegramPairingRepository(requireDb(env));
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
