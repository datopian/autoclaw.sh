import { requireDb } from "../db/client";
import { createTenantOpenClawRuntimeRepository } from "../db/repositories/openclaw-runtime";
import { createRuntimeSkillPolicyRepository } from "../db/repositories/runtime-skill-policy";
import { applySkillPack, getSkillPack } from "./skill-packs";
import type { Env } from "../types";

const DEFAULT_SLEEP_AFTER = "10m";

const DEFAULT_WORKSPACE_FILES: Record<string, string> = {
  "AGENTS.md": `# Agent Instructions

You are OpenClaw Autopilot, a personal AI operator for this tenant.
- Prefer concise, actionable responses.
- Ask clarifying questions when user intent is ambiguous.
- Do not invent capabilities you cannot execute.
`,
  "BOOTSTRAP.md": `# Bootstrap

Welcome. You have a fresh OpenClaw workspace for this tenant.

1. Read \`IDENTITY.md\`, \`USER.md\`, and \`SOUL.md\`.
2. Ask the user how they want this agent to behave.
3. Fill in identity and user details.
4. Keep \`TOOLS.md\` updated with environment-specific notes.
5. Keep \`HEARTBEAT.md\` minimal and task-focused.

Once onboarding is done, this file can be removed.
`,
  "SOUL.md": `# Soul

This agent is helpful, direct, and reliable. It should optimize for user outcomes, privacy, and clear communication.
`,
  "TOOLS.md": `# Tools

Document available tools and constraints here as integrations are enabled.
`,
  "IDENTITY.md": `# Identity

Name: OpenClaw Autopilot
Role: Personal AI operator for this tenant
`,
  "USER.md": `# User

Store stable user preferences and communication style here.
`,
  "HEARTBEAT.md": `# Heartbeat

Use this file for periodic state notes and pending follow-ups.
`
};

function isValidSleepAfter(value: string): boolean {
  return value === "never" || /^\d+[smhd]$/i.test(value);
}

export function resolveDefaultSleepAfter(env: Pick<Env, "OPENCLAW_SANDBOX_SLEEP_AFTER">): string {
  const raw = env.OPENCLAW_SANDBOX_SLEEP_AFTER?.trim().toLowerCase();
  if (!raw) {
    return DEFAULT_SLEEP_AFTER;
  }
  return isValidSleepAfter(raw) ? raw : DEFAULT_SLEEP_AFTER;
}

function buildWorkspacePrefix(tenantId: string): string {
  return `tenant/${tenantId}/openclaw/workspace`;
}

export async function ensureTenantOpenClawBootstrap(
  env: Env,
  tenantId: string
): Promise<void> {
  if (!env.ARTIFACTS) {
    return;
  }

  const db = requireDb(env);
  const runtimes = createTenantOpenClawRuntimeRepository(db);
  const runtimeSkillPolicies = createRuntimeSkillPolicyRepository(db);
  const workspacePrefix = buildWorkspacePrefix(tenantId);
  const sleepAfter = resolveDefaultSleepAfter(env);

  await runtimes.ensure({
    tenantId,
    workspacePrefix,
    sleepAfter
  });

  const writes = Object.entries(DEFAULT_WORKSPACE_FILES).map(async ([name, content]) => {
    const key = `${workspacePrefix}/${name}`;
    const existing = await env.ARTIFACTS.head(key);
    if (existing) {
      return;
    }
    await env.ARTIFACTS.put(key, content, {
      httpMetadata: { contentType: "text/markdown; charset=utf-8" }
    });
  });

  await Promise.all(writes);
  await runtimes.markBootstrapped(tenantId);

  // Apply default basic pack once so new tenants have an opinionated starter policy.
  const basicPack = getSkillPack("basic");
  if (basicPack) {
    await applySkillPack({
      repo: runtimeSkillPolicies,
      tenantId,
      pack: basicPack
    });
  }
}
