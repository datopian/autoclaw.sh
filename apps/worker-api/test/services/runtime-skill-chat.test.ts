import { describe, expect, it } from "vitest";
import { formatTelegramSkillsMessage } from "../../src/services/runtime-skill-chat";

describe("runtime skill chat formatter", () => {
  it("formats enabled skills list with readiness markers", () => {
    const message = formatTelegramSkillsMessage({
      tenantId: "t_1",
      skills: [
        {
          name: "weather",
          eligible: true,
          disabled: false,
          blockedByAllowlist: false,
          missing: null,
          policy: { allowed: true, enabled: true, hidden: false },
          effectiveReady: true
        },
        {
          name: "openai-whisper-api",
          eligible: false,
          disabled: false,
          blockedByAllowlist: false,
          missing: { env: ["OPENAI_API_KEY"] },
          policy: { allowed: true, enabled: true, hidden: false },
          effectiveReady: false
        }
      ]
    });

    expect(message).toContain("Enabled skills for tenant t_1");
    expect(message).toContain("✅ weather");
    expect(message).toContain("⚠️ openai-whisper-api");
  });
});
