import { requireDb } from "../db/client";
import { createTenantOpenClawRuntimeRepository } from "../db/repositories/openclaw-runtime";
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

type OpenClawSkillRaw = {
  name?: unknown;
  description?: unknown;
  emoji?: unknown;
  eligible?: unknown;
  disabled?: unknown;
  blockedByAllowlist?: unknown;
  source?: unknown;
  homepage?: unknown;
  missing?: unknown;
};

export type OpenClawSkill = {
  name: string;
  description: string;
  emoji: string | null;
  eligible: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  source: string | null;
  homepage: string | null;
  missing: Record<string, unknown> | null;
};

function parseSleepAfter(value: string): { keepAlive?: boolean; sleepAfter?: string } {
  if (value === "never") {
    return { keepAlive: true };
  }
  return { sleepAfter: value };
}

function parseFirstJsonObject(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function coerceSkill(value: OpenClawSkillRaw): OpenClawSkill | null {
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) {
    return null;
  }
  return {
    name,
    description: typeof value.description === "string" ? value.description : "",
    emoji: typeof value.emoji === "string" ? value.emoji : null,
    eligible: value.eligible === true,
    disabled: value.disabled === true,
    blockedByAllowlist: value.blockedByAllowlist === true,
    source: typeof value.source === "string" ? value.source : null,
    homepage: typeof value.homepage === "string" ? value.homepage : null,
    missing:
      value.missing && typeof value.missing === "object"
        ? (value.missing as Record<string, unknown>)
        : null
  };
}

export function parseOpenClawSkillsPayload(payload: unknown): OpenClawSkill[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const candidate = payload as { skills?: unknown };
  if (!Array.isArray(candidate.skills)) {
    return [];
  }
  return candidate.skills
    .map((item) => (item && typeof item === "object" ? coerceSkill(item as OpenClawSkillRaw) : null))
    .filter((item): item is OpenClawSkill => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTenantRuntimeOpenClawSkills(input: {
  env: Env;
  tenantId: string;
}): Promise<OpenClawSkill[]> {
  if (!input.env.Sandbox) {
    throw new Error("sandbox binding is not configured");
  }

  const db = requireDb(input.env);
  const runtimes = createTenantOpenClawRuntimeRepository(db);
  const runtime = await runtimes.findByTenantId(input.tenantId);
  if (!runtime) {
    throw new Error("runtime record not found");
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

  const result = await sandbox.exec("openclaw skills list --json", {
    cwd: "/root/clawd",
    timeout: 30_000
  });

  if (!result.success) {
    throw new Error(
      `openclaw skills list failed (exit ${result.exitCode}): ${result.stderr.trim() || "unknown error"}`
    );
  }

  const parsed = parseFirstJsonObject(result.stdout);
  return parseOpenClawSkillsPayload(parsed);
}
