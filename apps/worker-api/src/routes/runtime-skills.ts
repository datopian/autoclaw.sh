import { requireDb } from "../db/client";
import { createRuntimeSkillPolicyRepository } from "../db/repositories/runtime-skill-policy";
import { createTenantRepository } from "../db/repositories/tenants";
import { json, methodNotAllowed, parseJson } from "../lib/http";
import { ensureTenantOpenClawBootstrap } from "../services/openclaw-bootstrap";
import { listTenantRuntimeOpenClawSkills } from "../services/openclaw-skills";
import { ensureTenantOpenClawRuntime } from "../services/openclaw-runtime";
import {
  buildRuntimeSkillDiagnostics,
  buildRuntimeSkillRemediationChanges,
  type MergedRuntimeSkill,
  type RuntimeSkillRemediationStrategy
} from "../services/runtime-skill-diagnostics";
import { applySkillPack, getSkillPack, listSkillPacks } from "../services/skill-packs";
import type { Env } from "../types";

type RuntimeSkillsPatchInput = {
  tenantId?: string;
  policies?: Array<{
    name?: string;
    allowed?: boolean;
    enabled?: boolean;
    hidden?: boolean;
  }>;
};

type ApplyPackInput = {
  tenantId?: string;
  pack?: string;
  force?: boolean;
};

type RemediateRuntimeSkillsInput = {
  tenantId?: string;
  strategy?: RuntimeSkillRemediationStrategy;
};

function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

function parseBooleanQuery(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return value.toLowerCase() === "1" || value.toLowerCase() === "true";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);
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

export async function handleRuntimeSkills(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const isPacksRoute = url.pathname.endsWith("/packs");
  const isDiagnosticsRoute = url.pathname.endsWith("/diagnostics");
  const isRemediateRoute = url.pathname.endsWith("/remediate");
  const db = requireDb(env);
  const tenants = createTenantRepository(db);
  const policies = createRuntimeSkillPolicyRepository(db);

  const resolveMergedSkills = async (
    tenantId: string
  ): Promise<{ status: "ok"; skills: MergedRuntimeSkill[] } | { status: "starting" }> => {
    const inventory = withTimeout(
      (async () => {
        await ensureTenantOpenClawBootstrap(env, tenantId);
        await ensureTenantOpenClawRuntime(env, tenantId);
        return await listTenantRuntimeOpenClawSkills({ env, tenantId });
      })(),
      20_000
    );

    let skills;
    try {
      skills = await inventory;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      if (message === "timeout") {
        return { status: "starting" };
      }
      throw error;
    }
    const policyList = await policies.listByTenant(tenantId);
    const policyMap = new Map(policyList.map((policy) => [policy.skillName, policy]));
    const merged = skills.map((skill) => {
      const policy = policyMap.get(skill.name);
      const allowed = policy?.allowed ?? true;
      const enabled = policy?.enabled ?? true;
      const hidden = policy?.hidden ?? false;
      const effectiveReady =
        skill.eligible && !skill.disabled && !skill.blockedByAllowlist && allowed && enabled;
      return {
        ...skill,
        policy: { allowed, enabled, hidden },
        effectiveReady
      };
    });
    return { status: "ok", skills: merged };
  };

  if (isPacksRoute) {
    if (request.method === "GET") {
      return json({ packs: listSkillPacks() });
    }

    if (request.method === "POST") {
      const body = await parseJson<ApplyPackInput>(request);
      if (!body) {
        return badRequest("invalid json body");
      }

      const tenantId = body.tenantId?.trim();
      if (!tenantId) {
        return badRequest("tenantId is required");
      }
      const pack = getSkillPack(body.pack);
      if (!pack) {
        return badRequest("pack must be one of: basic, creator, ops");
      }

      const tenant = await tenants.findById(tenantId);
      if (!tenant) {
        return json({ error: "tenant not found" }, 404);
      }

      const applied = await applySkillPack({
        repo: policies,
        tenantId,
        pack,
        force: body.force === true
      });
      const policyList = await policies.listByTenant(tenantId);

      return json({
        ok: applied.applied,
        tenantId,
        pack: pack.name,
        reason: applied.reason,
        policiesApplied: applied.policiesApplied,
        policies: policyList
      });
    }

    return methodNotAllowed("GET, POST");
  }

  if (isDiagnosticsRoute) {
    if (request.method !== "GET") {
      return methodNotAllowed("GET");
    }
    const tenantId = url.searchParams.get("tenantId")?.trim();
    if (!tenantId) {
      return badRequest("tenantId is required");
    }
    const tenant = await tenants.findById(tenantId);
    if (!tenant) {
      return json({ error: "tenant not found" }, 404);
    }

    const merged = await resolveMergedSkills(tenantId);
    if (merged.status === "starting") {
      return json(
        {
          tenantId,
          status: "starting",
          error:
            "runtime is warming up; retry GET /api/runtime/skills/diagnostics in ~20-30 seconds"
        },
        202
      );
    }

    const diagnostics = buildRuntimeSkillDiagnostics(
      merged.skills
    );
    return json({
      tenantId,
      ...diagnostics
    });
  }

  if (isRemediateRoute) {
    if (request.method !== "POST") {
      return methodNotAllowed("POST");
    }
    const body = await parseJson<RemediateRuntimeSkillsInput>(request);
    if (!body) {
      return badRequest("invalid json body");
    }
    const tenantId = body.tenantId?.trim();
    if (!tenantId) {
      return badRequest("tenantId is required");
    }
    const strategy = body.strategy ?? "hide_unavailable";
    if (strategy !== "hide_unavailable" && strategy !== "enable_ready") {
      return badRequest("strategy must be hide_unavailable or enable_ready");
    }

    const tenant = await tenants.findById(tenantId);
    if (!tenant) {
      return json({ error: "tenant not found" }, 404);
    }

    const merged = await resolveMergedSkills(tenantId);
    if (merged.status === "starting") {
      return json(
        {
          tenantId,
          status: "starting",
          error:
            "runtime is warming up; retry POST /api/runtime/skills/remediate in ~20-30 seconds"
        },
        202
      );
    }

    const changes = buildRuntimeSkillRemediationChanges({
      skills: merged.skills,
      strategy
    });
    for (const change of changes) {
      // eslint-disable-next-line no-await-in-loop
      await policies.upsert({
        tenantId,
        skillName: change.name,
        allowed: change.allowed,
        enabled: change.enabled,
        hidden: change.hidden
      });
    }
    return json({
      ok: true,
      tenantId,
      strategy,
      changesApplied: changes.length
    });
  }

  if (request.method === "GET") {
    const tenantId = url.searchParams.get("tenantId")?.trim();
    const includeHidden = parseBooleanQuery(url.searchParams.get("includeHidden"));
    if (!tenantId) {
      return badRequest("tenantId is required");
    }

    const tenant = await tenants.findById(tenantId);
    if (!tenant) {
      return json({ error: "tenant not found" }, 404);
    }

    const mergedResult = await resolveMergedSkills(tenantId);
    if (mergedResult.status === "starting") {
      return json(
        {
          tenantId,
          status: "starting",
          error:
            "runtime is warming up; retry GET /api/runtime/skills in ~20-30 seconds"
        },
        202
      );
    }

    const merged = mergedResult.skills
      .filter((skill) => includeHidden || !skill.policy.hidden);

    return json({
      tenantId,
      total: merged.length,
      skills: merged
    });
  }

  if (request.method === "PATCH") {
    const body = await parseJson<RuntimeSkillsPatchInput>(request);
    if (!body) {
      return badRequest("invalid json body");
    }
    const tenantId = body.tenantId?.trim();
    if (!tenantId) {
      return badRequest("tenantId is required");
    }
    if (!Array.isArray(body.policies) || body.policies.length === 0) {
      return badRequest("policies[] is required");
    }

    const tenant = await tenants.findById(tenantId);
    if (!tenant) {
      return json({ error: "tenant not found" }, 404);
    }

    for (const policy of body.policies) {
      const name = policy.name?.trim();
      if (!name) {
        return badRequest("each policy requires a name");
      }
      // eslint-disable-next-line no-await-in-loop
      await policies.upsert({
        tenantId,
        skillName: name,
        allowed: policy.allowed,
        enabled: policy.enabled,
        hidden: policy.hidden
      });
    }

    const updated = await policies.listByTenant(tenantId);
    return json({
      ok: true,
      tenantId,
      policies: updated
    });
  }

  return methodNotAllowed("GET, PATCH");
}
