import { json } from "../lib/http";
import { invokeAIGateway } from "../services/ai-gateway";
import { normalizeProvider, requireApiKey } from "../services/secrets";
import type { Env } from "../types";

type ExecuteMessage = {
  runId?: string;
  tenantId?: string;
  templateId?: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  at: string;
};

type TelegramReplyMessage = {
  tenantId?: string;
  telegramUserId?: string;
  prompt?: string;
  modelProvider?: string;
  modelId?: string;
  byokApiKey?: string;
};

export class AgentSession {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    if (url.pathname === "/v1/execute") {
      return this.handleExecute(request);
    }

    if (url.pathname === "/v1/telegram/reply") {
      return this.handleTelegramReply(request);
    }

    return json({ error: "Not found" }, 404);
  }

  private async handleExecute(request: Request): Promise<Response> {
    const payload = (await request.json()) as ExecuteMessage;
    if (!payload.runId || !payload.tenantId || !payload.templateId) {
      return json({ error: "invalid payload" }, 400);
    }

    // DO instance acts as a per-agent coordinator key. Keep a small state trail.
    await this.state.storage.put("lastRun", {
      runId: payload.runId,
      at: new Date().toISOString()
    });

    return json({ ok: true, runId: payload.runId }, 200);
  }

  private async handleTelegramReply(request: Request): Promise<Response> {
    const payload = (await request.json()) as TelegramReplyMessage;
    if (
      !payload.tenantId ||
      !payload.telegramUserId ||
      !payload.prompt ||
      !payload.modelProvider ||
      !payload.modelId ||
      !payload.byokApiKey
    ) {
      return json({ error: "invalid payload" }, 400);
    }

    if (!this.env.CF_ACCOUNT_ID || !this.env.AI_GATEWAY_ID) {
      return json({ error: "ai gateway env not configured" }, 503);
    }

    const historyKey = `telegram_history:${payload.telegramUserId}`;
    const history =
      ((await this.state.storage.get(historyKey)) as ChatTurn[] | undefined) ?? [];

    history.push({
      role: "user",
      text: payload.prompt,
      at: new Date().toISOString()
    });
    const boundedHistory = history.slice(-12);

    const gatewayPrompt = boundedHistory
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`)
      .join("\n\n");

    const gatewayResponse = await invokeAIGateway({
      accountId: this.env.CF_ACCOUNT_ID,
      gatewayId: this.env.AI_GATEWAY_ID,
      baseUrl: this.env.AI_GATEWAY_BASE_URL,
      provider: normalizeProvider(payload.modelProvider),
      model: payload.modelId,
      apiKey: requireApiKey(payload.byokApiKey),
      prompt: gatewayPrompt
    });

    const reply = this.extractGatewayText(gatewayResponse) ?? "Processed. No text content returned.";
    boundedHistory.push({
      role: "assistant",
      text: reply,
      at: new Date().toISOString()
    });
    await this.state.storage.put(historyKey, boundedHistory.slice(-12));

    return json({ ok: true, reply }, 200);
  }

  private extractGatewayText(payload: unknown): string | null {
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
}
