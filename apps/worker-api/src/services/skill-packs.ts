import { createRuntimeSkillPolicyRepository } from "../db/repositories/runtime-skill-policy";

export type SkillPackName = "basic" | "creator" | "ops";

export type SkillPack = {
  name: SkillPackName;
  label: string;
  description: string;
  skills: string[];
};

const SKILL_PACKS: Record<SkillPackName, SkillPack> = {
  basic: {
    name: "basic",
    label: "Basic",
    description: "Core assistant capabilities for daily use.",
    skills: ["weather", "summarize", "session-logs"]
  },
  creator: {
    name: "creator",
    label: "Creator",
    description: "Research and content workflows for builders and creators.",
    skills: ["summarize", "gemini", "github", "openai-whisper-api"]
  },
  ops: {
    name: "ops",
    label: "Ops",
    description: "Operational monitoring and technical execution workflows.",
    skills: ["healthcheck", "tmux", "github", "session-logs"]
  }
};

const KNOWN_PACK_SKILLS = Array.from(
  new Set(
    Object.values(SKILL_PACKS)
      .flatMap((pack) => pack.skills)
      .map((skill) => skill.trim())
      .filter(Boolean)
  )
).sort();

export function listSkillPacks(): SkillPack[] {
  return Object.values(SKILL_PACKS);
}

export function getSkillPack(name: string | undefined): SkillPack | null {
  if (!name) {
    return null;
  }
  const key = name.trim().toLowerCase() as SkillPackName;
  if (key in SKILL_PACKS) {
    return SKILL_PACKS[key];
  }
  return null;
}

export async function applySkillPack(input: {
  repo: ReturnType<typeof createRuntimeSkillPolicyRepository>;
  tenantId: string;
  pack: SkillPack;
  force?: boolean;
}): Promise<{
  applied: boolean;
  reason: string;
  policiesApplied: number;
}> {
  const existing = await input.repo.listByTenant(input.tenantId);
  if (existing.length > 0 && !input.force) {
    return {
      applied: false,
      reason: "tenant already has skill policies; use force=true to replace",
      policiesApplied: 0
    };
  }

  const selected = new Set(input.pack.skills);
  for (const skillName of KNOWN_PACK_SKILLS) {
    // eslint-disable-next-line no-await-in-loop
    await input.repo.upsert({
      tenantId: input.tenantId,
      skillName,
      allowed: true,
      enabled: selected.has(skillName),
      hidden: !selected.has(skillName)
    });
  }

  return {
    applied: true,
    reason: "ok",
    policiesApplied: KNOWN_PACK_SKILLS.length
  };
}
