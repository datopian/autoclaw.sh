import { describe, expect, it } from "vitest";
import { buildTenantPrompt } from "../../src/services/context-pack";

describe("context pack", () => {
  it("includes recent conversation memory snippets when provided", () => {
    const prompt = buildTenantPrompt({
      userMessage: "What did we decide yesterday?",
      systemPrompt: "Be concise.",
      profiles: [
        {
          id: "p1",
          tenantId: "t1",
          factKey: "tone",
          valueJson: "\"direct\"",
          confidence: 0.9,
          version: 1,
          updatedAt: new Date().toISOString()
        }
      ],
      recentMemories: [
        {
          role: "user",
          text: "Let's finalize pricing in USD.",
          createdAt: new Date().toISOString()
        },
        {
          role: "assistant",
          text: "Confirmed. Pricing will be in USD.",
          createdAt: new Date().toISOString()
        }
      ]
    });

    expect(prompt).toContain("Known User Preferences:");
    expect(prompt).toContain("Recent Conversation Memory:");
    expect(prompt).toContain("[user] Let's finalize pricing in USD.");
    expect(prompt).toContain("[assistant] Confirmed. Pricing will be in USD.");
    expect(prompt).toContain("User Message:");
  });
});
