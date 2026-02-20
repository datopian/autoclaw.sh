import { requireDb } from "../db/client";
import { createWorkspaceRepository } from "../db/repositories/workspaces";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import type { Env } from "../types";

type SkillsQueryInput = {
  tenantId?: string;
};

type CreateSkillInput = {
  tenantId?: string;
  name?: string;
  kind?: string;
  content?: string;
  enabled?: boolean;
};

type UpdateSkillInput = {
  tenantId?: string;
  skillId?: string;
  name?: string;
  kind?: string;
  content?: string;
  enabled?: boolean;
};

type DeleteSkillInput = {
  tenantId?: string;
  skillId?: string;
};

function buildSkillObjectKey(input: {
  tenantId: string;
  skillId: string;
  at: Date;
}): string {
  const yyyy = String(input.at.getUTCFullYear());
  const mm = String(input.at.getUTCMonth() + 1).padStart(2, "0");
  return `tenant/${input.tenantId}/skills/${yyyy}/${mm}/${input.skillId}.md`;
}

function safeSkillContent(value: string): string {
  return value.trim().slice(0, 16_000);
}

function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

function toSkillResponse(skill: {
  id: string;
  workspaceId: string;
  name: string;
  kind: string;
  enabled: boolean;
  updatedAt: string;
}): Record<string, unknown> {
  return {
    id: skill.id,
    workspaceId: skill.workspaceId,
    name: skill.name,
    kind: skill.kind,
    enabled: skill.enabled,
    updatedAt: skill.updatedAt
  };
}

export async function handleWorkspaceSkills(
  request: Request,
  env: Env
): Promise<Response> {
  const db = requireDb(env);
  const workspaces = createWorkspaceRepository(db);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId")?.trim();
    if (!tenantId) {
      return badRequest("tenantId is required");
    }
    const workspace = await workspaces.ensureForTenant({ tenantId });
    const skills = await workspaces.listSkills(workspace.id);

    const withContent = await Promise.all(
      skills.map(async (skill) => {
        const object = await env.ARTIFACTS.get(skill.r2Key);
        return {
          ...toSkillResponse(skill),
          content: object ? await object.text() : ""
        };
      })
    );
    return json({ skills: withContent });
  }

  if (request.method === "POST") {
    const body = await parseJson<CreateSkillInput>(request);
    if (!body) {
      return badRequest("invalid json body");
    }
    const tenantId = body?.tenantId?.trim();
    const name = body?.name?.trim();
    const content = body?.content?.trim();
    if (!tenantId || !name || !content) {
      return badRequest("tenantId, name, and content are required");
    }
    const workspace = await workspaces.ensureForTenant({ tenantId });
    const skillId = crypto.randomUUID();
    const now = new Date();
    const r2Key = buildSkillObjectKey({ tenantId, skillId, at: now });
    await env.ARTIFACTS.put(r2Key, safeSkillContent(content), {
      httpMetadata: { contentType: "text/markdown; charset=utf-8" }
    });
    const created = await workspaces.createSkill({
      workspaceId: workspace.id,
      skillId,
      name,
      kind: body.kind?.trim() || "instruction",
      r2Key,
      enabled: body.enabled !== false
    });
    return json({
      skill: {
        ...toSkillResponse(created),
        content: safeSkillContent(content)
      }
    });
  }

  if (request.method === "PATCH") {
    const body = await parseJson<UpdateSkillInput>(request);
    if (!body) {
      return badRequest("invalid json body");
    }
    const tenantId = body?.tenantId?.trim();
    const skillId = body?.skillId?.trim();
    if (!tenantId || !skillId) {
      return badRequest("tenantId and skillId are required");
    }
    const workspace = await workspaces.ensureForTenant({ tenantId });
    const existing = await workspaces.findSkill(workspace.id, skillId);
    if (!existing) {
      return json({ error: "skill not found" }, 404);
    }

    let r2Key = existing.r2Key;
    let content = "";
    const currentObj = await env.ARTIFACTS.get(existing.r2Key);
    if (currentObj) {
      content = await currentObj.text();
    }
    if (typeof body.content === "string") {
      content = safeSkillContent(body.content);
      const now = new Date();
      r2Key = buildSkillObjectKey({ tenantId, skillId, at: now });
      await env.ARTIFACTS.put(r2Key, content, {
        httpMetadata: { contentType: "text/markdown; charset=utf-8" }
      });
      if (r2Key !== existing.r2Key) {
        await env.ARTIFACTS.delete(existing.r2Key);
      }
    }

    await workspaces.updateSkill({
      workspaceId: workspace.id,
      skillId,
      name: body.name?.trim() || existing.name,
      kind: body.kind?.trim() || existing.kind,
      r2Key,
      enabled: typeof body.enabled === "boolean" ? body.enabled : existing.enabled
    });
    const updated = await workspaces.findSkill(workspace.id, skillId);
    return json({
      skill: {
        ...toSkillResponse(updated ?? existing),
        content
      }
    });
  }

  if (request.method === "DELETE") {
    const body = await parseJson<DeleteSkillInput>(request);
    if (!body) {
      return badRequest("invalid json body");
    }
    const tenantId = body?.tenantId?.trim();
    const skillId = body?.skillId?.trim();
    if (!tenantId || !skillId) {
      return badRequest("tenantId and skillId are required");
    }
    const workspace = await workspaces.ensureForTenant({ tenantId });
    const existing = await workspaces.findSkill(workspace.id, skillId);
    if (!existing) {
      return json({ ok: true });
    }
    await workspaces.deleteSkill(workspace.id, skillId);
    await env.ARTIFACTS.delete(existing.r2Key);
    return json({ ok: true });
  }

  return methodNotAllowed("GET, POST, PATCH, DELETE");
}
