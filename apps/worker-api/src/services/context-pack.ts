import type { MemoryProfileRecord } from "../db/repositories/memory";

function profileValueToText(valueJson: string): string {
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }
    return JSON.stringify(parsed);
  } catch {
    return valueJson;
  }
}

export function buildTenantPrompt(input: {
  userMessage: string;
  systemPrompt?: string | null;
  profiles?: MemoryProfileRecord[];
}): string {
  const sections: string[] = [];

  if (input.systemPrompt?.trim()) {
    sections.push(`System Instructions:\n${input.systemPrompt.trim()}`);
  }

  const profileLines = (input.profiles ?? [])
    .map((profile) => `- ${profile.factKey}: ${profileValueToText(profile.valueJson)}`)
    .slice(0, 12);
  if (profileLines.length > 0) {
    sections.push(`Known User Preferences:\n${profileLines.join("\n")}`);
  }

  sections.push(`User Message:\n${input.userMessage.trim()}`);

  return sections.join("\n\n");
}
