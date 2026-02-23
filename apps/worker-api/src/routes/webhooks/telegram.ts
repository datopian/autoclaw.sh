import { requireDb } from "../../db/client";
import { createMemoryRepository } from "../../db/repositories/memory";
import { createRuntimeSkillPolicyRepository } from "../../db/repositories/runtime-skill-policy";
import { createTelegramPairingRepository } from "../../db/repositories/telegram-pairings";
import { createTenantRepository } from "../../db/repositories/tenants";
import { createWorkspaceRepository } from "../../db/repositories/workspaces";
import { json, methodNotAllowed, parseJson } from "../../lib/http";
import {
  buildTenantPrompt,
  type PromptMemorySnippet,
  type PromptSkillSnippet
} from "../../services/context-pack";
import { ensureTenantOpenClawBootstrap } from "../../services/openclaw-bootstrap";
import { runTenantOpenClawAgentTurn } from "../../services/openclaw-agent";
import { listTenantRuntimeOpenClawSkills } from "../../services/openclaw-skills";
import { ensureTenantOpenClawRuntime } from "../../services/openclaw-runtime";
import { formatTelegramSkillsMessage } from "../../services/runtime-skill-chat";
import type { MergedRuntimeSkill } from "../../services/runtime-skill-diagnostics";
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
  const TELEGRAM_MAX_MESSAGE_CHARS = 3800;
  const trimmed = input.text.trim();
  const chunks: string[] = [];
  if (trimmed.length <= TELEGRAM_MAX_MESSAGE_CHARS) {
    chunks.push(trimmed);
  } else {
    let remaining = trimmed;
    while (remaining.length > 0) {
      if (remaining.length <= TELEGRAM_MAX_MESSAGE_CHARS) {
        chunks.push(remaining);
        break;
      }
      const candidate = remaining.slice(0, TELEGRAM_MAX_MESSAGE_CHARS);
      const breakAt = Math.max(candidate.lastIndexOf("\n"), candidate.lastIndexOf(" "));
      const cut = breakAt > 200 ? breakAt : TELEGRAM_MAX_MESSAGE_CHARS;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trimStart();
    }
  }

  for (const chunk of chunks) {
    const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: chunk
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`telegram send failed: ${response.status} ${body}`);
    }
  }
}

function buildMemoryObjectKey(input: { tenantId: string; eventId: string; at: Date }): string {
  const yyyy = String(input.at.getUTCFullYear());
  const mm = String(input.at.getUTCMonth() + 1).padStart(2, "0");
  return `tenant/${input.tenantId}/memory/raw/${yyyy}/${mm}/${input.eventId}.json`;
}

function compactMemoryText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

async function loadRecentMemorySnippets(input: {
  env: Env;
  events: Array<{ role: string; contentR2Key: string; createdAt: string }>;
  limit: number;
}): Promise<PromptMemorySnippet[]> {
  const snippets: PromptMemorySnippet[] = [];
  const events = [...input.events].reverse();
  for (const event of events) {
    if (snippets.length >= input.limit) {
      break;
    }
    const object = await input.env.ARTIFACTS.get(event.contentR2Key);
    if (!object) {
      continue;
    }
    const body = await object.text();
    try {
      const payload = JSON.parse(body) as { text?: unknown };
      if (typeof payload.text !== "string") {
        continue;
      }
      const text = compactMemoryText(payload.text);
      if (!text) {
        continue;
      }
      snippets.push({
        role: event.role,
        text,
        createdAt: event.createdAt
      });
    } catch {
      continue;
    }
  }
  return snippets;
}

function compactSkillContent(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 420);
}

async function loadEnabledSkills(input: {
  env: Env;
  skills: Array<{ name: string; kind: string; r2Key: string }>;
  limit: number;
}): Promise<PromptSkillSnippet[]> {
  const loaded: PromptSkillSnippet[] = [];
  for (const skill of input.skills.slice(0, input.limit)) {
    const object = await input.env.ARTIFACTS.get(skill.r2Key);
    if (!object) {
      continue;
    }
    const content = compactSkillContent(await object.text());
    if (!content) {
      continue;
    }
    loaded.push({
      name: skill.name,
      kind: skill.kind,
      content
    });
  }
  return loaded;
}

function parseCsvSet(value: string | undefined): Set<string> {
  if (!value?.trim()) {
    return new Set();
  }
  return new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

function shouldUseRuntimeMode(input: { env: Env; tenantId: string }): boolean {
  if ((input.env.TELEGRAM_RUNTIME_MODE ?? "direct").trim().toLowerCase() !== "openclaw_runtime") {
    return false;
  }
  const allowlist = parseCsvSet(input.env.TELEGRAM_RUNTIME_ALLOWLIST);
  if (allowlist.size === 0) {
    return true;
  }
  return allowlist.has(input.tenantId);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function generateReplyViaAgentSession(input: {
  env: Env;
  tenantId: string;
  telegramUserId: string;
  userMessage: string;
  modelProvider: string;
  modelId: string;
  byokApiKey: string;
  memory: ReturnType<typeof createMemoryRepository>;
  workspaces: ReturnType<typeof createWorkspaceRepository>;
}): Promise<string> {
  const workspace = await input.workspaces.ensureForTenant({ tenantId: input.tenantId });
  const promptRecord = await input.workspaces.getPrompt(workspace.id);
  let systemPrompt: string | null = null;
  if (promptRecord?.system_prompt_r2_key) {
    const object = await input.env.ARTIFACTS.get(promptRecord.system_prompt_r2_key);
    if (object) {
      systemPrompt = await object.text();
    }
  }
  const profiles = await input.memory.listProfiles(input.tenantId, 8);
  const recentEvents = await input.memory.listRecentEvents(input.tenantId, 8);
  const recentMemories = await loadRecentMemorySnippets({
    env: input.env,
    events: recentEvents,
    limit: 6
  });
  const enabledSkills = await input.workspaces.listEnabledSkills(workspace.id);
  const skills = await loadEnabledSkills({
    env: input.env,
    skills: enabledSkills.map((skill) => ({
      name: skill.name,
      kind: skill.kind,
      r2Key: skill.r2Key
    })),
    limit: 5
  });
  const prompt = buildTenantPrompt({
    userMessage: input.userMessage,
    systemPrompt,
    profiles,
    recentMemories,
    skills
  });

  const sessionId = input.env.AGENT_SESSION.idFromName(`${input.tenantId}:telegram`);
  const session = input.env.AGENT_SESSION.get(sessionId);
  const sessionResponse = await session.fetch("https://agent-session/v1/telegram/reply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenantId: input.tenantId,
      telegramUserId: input.telegramUserId,
      prompt,
      modelProvider: input.modelProvider,
      modelId: input.modelId,
      byokApiKey: input.byokApiKey
    })
  });
  if (!sessionResponse.ok) {
    const body = await sessionResponse.text();
    throw new Error(`agent session failed: ${body || sessionResponse.status}`);
  }
  const sessionPayload = (await sessionResponse.json()) as { reply?: string };
  return (sessionPayload.reply ?? "").trim() || "Processed. No text content returned.";
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
  const runtimePolicies = createRuntimeSkillPolicyRepository(db);
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
  const tenantId = pairing.tenantId;

  const tenant = await tenants.findById(tenantId);
  if (lower === "/skills") {
    try {
      const runtimeMode = shouldUseRuntimeMode({ env, tenantId });
      if (!runtimeMode) {
        await sendTelegramMessage({
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: String(chatId),
          text: "Skill inventory is available only in runtime mode right now."
        });
        return json({ ok: true });
      }

      const runtimeList = await withTimeout(
        (async () => {
          await ensureTenantOpenClawBootstrap(env, tenantId);
          await ensureTenantOpenClawRuntime(env, tenantId);
          return await listTenantRuntimeOpenClawSkills({
            env,
            tenantId
          });
        })(),
        20_000
      );
      const policyList = await runtimePolicies.listByTenant(tenantId);
      const policyMap = new Map(policyList.map((policy) => [policy.skillName, policy]));
      const merged: MergedRuntimeSkill[] = runtimeList.map((skill) => {
        const policy = policyMap.get(skill.name);
        const allowed = policy?.allowed ?? true;
        const enabled = policy?.enabled ?? true;
        const hidden = policy?.hidden ?? false;
        return {
          ...skill,
          policy: { allowed, enabled, hidden },
          effectiveReady:
            skill.eligible && !skill.disabled && !skill.blockedByAllowlist && allowed && enabled
        };
      });

      const skillsMessage = formatTelegramSkillsMessage({
        tenantId,
        skills: merged
      });
      await sendTelegramMessage({
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: String(chatId),
        text: skillsMessage
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      if (reason === "timeout") {
        await sendTelegramMessage({
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: String(chatId),
          text: "Runtime is warming up. Retry /skills in about 20-30 seconds."
        });
        return json({ ok: true });
      }
      throw error;
    }

    return json({ ok: true });
  }

  if (!tenant?.byokApiKey || !tenant.modelProvider || !tenant.modelId) {
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: "Your agent is not fully configured yet. Add model provider, model, and API key in Step 2, then retry."
    });
    return json({ ok: true });
  }

  try {
    let reply = "";
      const runtimeMode = shouldUseRuntimeMode({ env, tenantId });

    if (runtimeMode) {
      try {
        await ensureTenantOpenClawBootstrap(env, tenantId);
        const runtime = await ensureTenantOpenClawRuntime(env, tenantId);
        const turn = await runTenantOpenClawAgentTurn({
          env,
          tenantId,
          telegramUserId: String(userId),
          message: text
        });
        reply = turn.reply;
        console.log("telegram runtime reply", {
          tenantId,
          runtimeStarted: runtime.started,
          runtimeReason: runtime.reason
        });
      } catch (runtimeError) {
        const fallbackEnabled = (env.TELEGRAM_RUNTIME_FALLBACK_DIRECT ?? "1") !== "0";
        if (!fallbackEnabled) {
          throw runtimeError;
        }
        const reason = runtimeError instanceof Error ? runtimeError.message : "unknown runtime error";
        console.warn("telegram runtime fallback to direct mode", {
          tenantId,
          reason
        });
        reply = await generateReplyViaAgentSession({
          env,
          tenantId,
          telegramUserId: String(userId),
          userMessage: text,
          modelProvider: tenant.modelProvider,
          modelId: tenant.modelId,
          byokApiKey: tenant.byokApiKey,
          memory,
          workspaces
        });
      }
    } else {
      if (!env.CF_ACCOUNT_ID || !env.AI_GATEWAY_ID) {
        await sendTelegramMessage({
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: String(chatId),
          text: "OpenClaw backend is not fully configured for model routing. Please contact support."
        });
        return json({ ok: true });
      }
      reply = await generateReplyViaAgentSession({
        env,
        tenantId,
        telegramUserId: String(userId),
        userMessage: text,
        modelProvider: tenant.modelProvider,
        modelId: tenant.modelId,
        byokApiKey: tenant.byokApiKey,
        memory,
        workspaces
      });
    }

    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: String(chatId),
      text: reply
    });

    const now = new Date();
    const userEventId = crypto.randomUUID();
    const userObjectKey = buildMemoryObjectKey({
      tenantId,
      eventId: userEventId,
      at: now
    });
    await env.ARTIFACTS.put(
      userObjectKey,
      JSON.stringify(
        {
          eventId: userEventId,
          tenantId,
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
      tenantId,
      role: "user",
      contentR2Key: userObjectKey,
      redactionVersion: "v1"
    });
    await env.MEMORY_INGEST_QUEUE.send({
      tenantId,
      eventId: userEvent.id,
      seq: userEvent.seq,
      eventTime: userEvent.createdAt
    });

    const assistantEventId = crypto.randomUUID();
    const assistantObjectKey = buildMemoryObjectKey({
      tenantId,
      eventId: assistantEventId,
      at: now
    });
    await env.ARTIFACTS.put(
      assistantObjectKey,
      JSON.stringify(
        {
          eventId: assistantEventId,
          tenantId,
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
      tenantId,
      role: "assistant",
      contentR2Key: assistantObjectKey,
      redactionVersion: "v1"
    });
    await env.MEMORY_INGEST_QUEUE.send({
      tenantId,
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
