import type { MemoryProfileRecord } from "../db/repositories/memory";

export type PromptMemorySnippet = {
  role: string;
  text: string;
  createdAt: string;
};

export type PromptSkillSnippet = {
  name: string;
  kind: string;
  content: string;
};

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
  recentMemories?: PromptMemorySnippet[];
  skills?: PromptSkillSnippet[];
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

  const memoryLines = (input.recentMemories ?? [])
    .filter((item) => item.text.trim().length > 0)
    .slice(0, 10)
    .map((item) => `- [${item.role}] ${item.text.trim()}`);
  if (memoryLines.length > 0) {
    sections.push(`Recent Conversation Memory:\n${memoryLines.join("\n")}`);
  }

  const skillLines = (input.skills ?? [])
    .filter((skill) => skill.content.trim().length > 0)
    .slice(0, 5)
    .map((skill) => `- ${skill.name} (${skill.kind}): ${skill.content.trim()}`);
  if (skillLines.length > 0) {
    sections.push(`Enabled Skills:\n${skillLines.join("\n")}`);
  }

  sections.push(`User Message:\n${input.userMessage.trim()}`);

  return sections.join("\n\n");
}
