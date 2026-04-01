export type MergedRuntimeSkill = {
  name: string;
  eligible: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  effectiveReady: boolean;
  missing: Record<string, unknown> | null;
  policy: {
    allowed: boolean;
    enabled: boolean;
    hidden: boolean;
  };
};

type MissingParts = {
  bins: string[];
  anyBins: string[];
  env: string[];
  config: string[];
  os: string[];
};

export type RuntimeSkillRemediationStrategy = "hide_unavailable" | "enable_ready";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function parseMissingParts(missing: Record<string, unknown> | null): MissingParts {
  return {
    bins: toStringArray(missing?.bins),
    anyBins: toStringArray(missing?.anyBins),
    env: toStringArray(missing?.env),
    config: toStringArray(missing?.config),
    os: toStringArray(missing?.os)
  };
}

export function buildRuntimeSkillDiagnostics(skills: MergedRuntimeSkill[]): {
  total: number;
  ready: number;
  unavailable: number;
  withMissingRequirements: number;
  skills: Array<
    MergedRuntimeSkill & {
      missingParts: MissingParts;
      unavailableReason: string | null;
    }
  >;
} {
  const enriched = skills.map((skill) => {
    const missingParts = parseMissingParts(skill.missing);
    let unavailableReason: string | null = null;
    if (!skill.policy.allowed) {
      unavailableReason = "blocked_by_policy_allowed";
    } else if (!skill.policy.enabled) {
      unavailableReason = "blocked_by_policy_enabled";
    } else if (skill.blockedByAllowlist) {
      unavailableReason = "blocked_by_allowlist";
    } else if (skill.disabled) {
      unavailableReason = "disabled";
    } else if (!skill.eligible) {
      unavailableReason = "missing_requirements";
    }

    return {
      ...skill,
      missingParts,
      unavailableReason
    };
  });

  return {
    total: enriched.length,
    ready: enriched.filter((skill) => skill.effectiveReady).length,
    unavailable: enriched.filter((skill) => !skill.effectiveReady).length,
    withMissingRequirements: enriched.filter(
      (skill) =>
        skill.missingParts.bins.length > 0 ||
        skill.missingParts.anyBins.length > 0 ||
        skill.missingParts.env.length > 0 ||
        skill.missingParts.config.length > 0 ||
        skill.missingParts.os.length > 0
    ).length,
    skills: enriched
  };
}

export function buildRuntimeSkillRemediationChanges(input: {
  skills: MergedRuntimeSkill[];
  strategy: RuntimeSkillRemediationStrategy;
}): Array<{
  name: string;
  allowed: boolean;
  enabled: boolean;
  hidden: boolean;
}> {
  if (input.strategy === "enable_ready") {
    return input.skills
      .filter((skill) => skill.eligible && !skill.disabled && !skill.blockedByAllowlist)
      .map((skill) => ({
        name: skill.name,
        allowed: true,
        enabled: true,
        hidden: false
      }));
  }

  return input.skills
    .filter((skill) => !skill.effectiveReady)
    .map((skill) => ({
      name: skill.name,
      allowed: skill.policy.allowed,
      enabled: false,
      hidden: true
    }));
}
