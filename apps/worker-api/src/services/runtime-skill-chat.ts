import {
  parseMissingParts,
  type MergedRuntimeSkill
} from "./runtime-skill-diagnostics";

function summarizeMissing(skill: MergedRuntimeSkill): string {
  const missing = parseMissingParts(skill.missing);
  if (missing.env.length > 0) {
    return `missing env: ${missing.env.slice(0, 2).join(", ")}`;
  }
  if (missing.bins.length > 0) {
    return `missing tools: ${missing.bins.slice(0, 2).join(", ")}`;
  }
  if (missing.config.length > 0) {
    return `missing config: ${missing.config.slice(0, 2).join(", ")}`;
  }
  if (missing.os.length > 0) {
    return `unsupported OS`;
  }
  return "not ready";
}

export function formatTelegramSkillsMessage(input: {
  tenantId: string;
  skills: MergedRuntimeSkill[];
}): string {
  const enabled = input.skills
    .filter((skill) => skill.policy.allowed && skill.policy.enabled && !skill.policy.hidden)
    .sort((a, b) => {
      if (a.effectiveReady === b.effectiveReady) {
        return a.name.localeCompare(b.name);
      }
      return a.effectiveReady ? -1 : 1;
    });

  if (enabled.length === 0) {
    return "No tenant-enabled skills are currently active. Enable skills from dashboard settings.";
  }

  const readyCount = enabled.filter((skill) => skill.effectiveReady).length;
  const header = `Enabled skills for tenant ${input.tenantId}\nReady: ${readyCount}/${enabled.length}`;
  const lines = enabled.slice(0, 30).map((skill) => {
    if (skill.effectiveReady) {
      return `✅ ${skill.name}`;
    }
    return `⚠️ ${skill.name} — ${summarizeMissing(skill)}`;
  });
  const truncated = enabled.length > 30 ? `\n…and ${enabled.length - 30} more` : "";
  return `${header}\n\n${lines.join("\n")}${truncated}`;
}
