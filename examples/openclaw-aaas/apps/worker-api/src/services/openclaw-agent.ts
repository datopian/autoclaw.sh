import { requireDb } from "../db/client";
import { createTenantOpenClawRuntimeRepository } from "../db/repositories/openclaw-runtime";
import { createTenantRepository } from "../db/repositories/tenants";
import { syncTenantCustomSkillsToRuntime } from "./runtime-custom-skills";
import type { Env } from "../types";

type SandboxLike = {
  exec: (
    command: string,
    options?: { env?: Record<string, string | undefined>; cwd?: string; timeout?: number }
  ) => Promise<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
};

function parseSleepAfter(value: string): { keepAlive?: boolean; sleepAfter?: string } {
  if (value === "never") {
    return { keepAlive: true };
  }
  return { sleepAfter: value };
}

function extractAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const payloads = candidate.payloads;
  if (Array.isArray(payloads)) {
    const lines = payloads
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const text = (item as { text?: unknown }).text;
        return typeof text === "string" && text.trim() ? text.trim() : null;
      })
      .filter((line): line is string => Boolean(line));
    if (lines.length > 0) {
      return lines.join("\n\n");
    }
  }

  const directKeys = ["reply", "output_text", "message", "text"];
  for (const key of directKeys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const output = candidate.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        continue;
      }
      for (const part of content) {
        if (!part || typeof part !== "object") {
          continue;
        }
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text.trim()) {
          return text.trim();
        }
      }
    }
  }

  return null;
}

function parseFirstJsonObject(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue scanning line-by-line for CLI output that includes logs + JSON.
  }

  const lines = trimmed.split("\n");
  for (const line of lines) {
    const candidate = line.trim();
    if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
      continue;
    }
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // Ignore and return null below.
    }
  }

  return null;
}

export async function runTenantOpenClawAgentTurn(input: {
  env: Env;
  tenantId: string;
  telegramUserId: string;
  message: string;
}): Promise<{ reply: string }> {
  const db = requireDb(input.env);
  const runtimes = createTenantOpenClawRuntimeRepository(db);
  const tenants = createTenantRepository(db);
  const runtime = await runtimes.findByTenantId(input.tenantId);
  if (!runtime) {
    throw new Error("runtime record not found");
  }
  const tenant = await tenants.findById(input.tenantId);
  if (!tenant) {
    throw new Error("tenant not found");
  }
  if (!tenant.byokApiKey || !tenant.modelProvider) {
    throw new Error("tenant model provider/api key not configured");
  }

  if (!input.env.Sandbox) {
    throw new Error("sandbox binding is not configured");
  }

  const sandboxModule = await import("@cloudflare/sandbox");
  const sandbox = sandboxModule.getSandbox(
    input.env.Sandbox,
    `tenant:${input.tenantId}`,
    parseSleepAfter(runtime.sleepAfter)
  ) as SandboxLike;

  await syncTenantCustomSkillsToRuntime({
    env: input.env,
    tenantId: input.tenantId,
    sandbox
  });

  const sessionId = `telegram:${input.telegramUserId}`;
  const modelId = tenant.modelId?.trim();
  if (!modelId) {
    throw new Error("tenant model id is not configured");
  }
  const modelRef = `${tenant.modelProvider}/${modelId}`;
  const env: Record<string, string | undefined> = {
    OPENCLAW_SESSION_ID: sessionId,
    OPENCLAW_USER_MESSAGE: input.message,
    OPENCLAW_MODEL_REF: modelRef
  };
  if (tenant.modelProvider === "openai") {
    env.OPENAI_API_KEY = tenant.byokApiKey;
  } else if (tenant.modelProvider === "anthropic") {
    env.ANTHROPIC_API_KEY = tenant.byokApiKey;
  } else if (tenant.modelProvider === "google") {
    env.GEMINI_API_KEY = tenant.byokApiKey;
  }

  const setModelResult = await sandbox.exec('openclaw models set "$OPENCLAW_MODEL_REF"', {
    cwd: "/root/clawd",
    timeout: 30_000,
    env
  });

  if (!setModelResult.success) {
    throw new Error(
      `openclaw models set failed (exit ${setModelResult.exitCode}): ${setModelResult.stderr.trim() || setModelResult.stdout.trim() || "unknown error"}`
    );
  }

  const result = await sandbox.exec(
    'openclaw agent --local --session-id "$OPENCLAW_SESSION_ID" --message "$OPENCLAW_USER_MESSAGE" --json',
    {
      cwd: "/root/clawd",
      timeout: 90_000,
      env
    }
  );

  if (!result.success) {
    throw new Error(
      `openclaw agent failed (exit ${result.exitCode}): ${result.stderr.trim() || "unknown error"}`
    );
  }

  const parsed = parseFirstJsonObject(result.stdout);
  const text = extractAssistantText(parsed);
  if (text) {
    return { reply: text };
  }

  const fallback = result.stdout.trim();
  if (fallback) {
    return { reply: fallback };
  }

  throw new Error(`openclaw agent returned no reply: ${result.stderr.trim() || "empty output"}`);
}
