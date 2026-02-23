import { requireDb } from "../db/client";
import { createWorkspaceRepository } from "../db/repositories/workspaces";
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function sanitizeSkillFolderPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function sanitizeTenantIdForPath(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "");
}

export function renderTenantSkillMarkdown(input: {
  name: string;
  kind: string;
  content: string;
}): string {
  const normalizedName = input.name.trim() || "tenant-custom-skill";
  const description = `Tenant custom skill (${input.kind.trim() || "instruction"})`;
  const body = input.content.trim();
  return `---\nname: ${normalizedName}\ndescription: ${description}\n---\n\n# ${normalizedName}\n\n${body}\n`;
}

export async function syncTenantCustomSkillsToRuntime(input: {
  env: Env;
  tenantId: string;
  sandbox: SandboxLike;
}): Promise<void> {
  const db = requireDb(input.env);
  const workspaces = createWorkspaceRepository(db);
  const workspace = await workspaces.ensureForTenant({ tenantId: input.tenantId });
  const enabledSkills = await workspaces.listEnabledSkills(workspace.id);
  const tenantSafeId = sanitizeTenantIdForPath(input.tenantId);
  const tenantPrefix = `tenant-${tenantSafeId}-`;

  const cleanupResult = await input.sandbox.exec(
    `mkdir -p /root/.openclaw/skills && rm -rf /root/.openclaw/skills/${tenantPrefix}*`,
    { timeout: 20_000 }
  );
  if (!cleanupResult.success) {
    throw new Error(
      `failed to cleanup custom skills: ${cleanupResult.stderr.trim() || "unknown error"}`
    );
  }

  for (const skill of enabledSkills) {
    // eslint-disable-next-line no-await-in-loop
    const object = await input.env.ARTIFACTS.get(skill.r2Key);
    if (!object) {
      continue;
    }
    const folderPart = sanitizeSkillFolderPart(skill.name) || "custom-skill";
    const folder = `/root/.openclaw/skills/${tenantPrefix}${skill.id.slice(0, 8)}-${folderPart}`;
    // eslint-disable-next-line no-await-in-loop
    const markdown = renderTenantSkillMarkdown({
      name: skill.name,
      kind: skill.kind,
      content: await object.text()
    });
    const encoded = bytesToBase64(new TextEncoder().encode(markdown));
    const command = `mkdir -p ${shellQuote(folder)} && printf '%s' ${shellQuote(encoded)} | base64 -d > ${shellQuote(`${folder}/SKILL.md`)}`;
    // eslint-disable-next-line no-await-in-loop
    const result = await input.sandbox.exec(command, {
      timeout: 20_000
    });
    if (!result.success) {
      throw new Error(
        `failed to sync custom skill ${skill.name}: ${result.stderr.trim() || "unknown error"}`
      );
    }
  }
}
