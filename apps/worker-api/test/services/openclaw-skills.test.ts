import { describe, expect, it } from "vitest";
import { parseOpenClawSkillsPayload } from "../../src/services/openclaw-skills";

describe("openclaw skills parser", () => {
  it("parses valid skills payload", () => {
    const parsed = parseOpenClawSkillsPayload({
      skills: [
        {
          name: "weather",
          description: "Forecast helper",
          emoji: "🌤️",
          eligible: true,
          disabled: false,
          blockedByAllowlist: false,
          source: "openclaw-bundled",
          homepage: "https://example.com/weather",
          missing: { bins: [] }
        },
        {
          description: "missing name should be ignored"
        }
      ]
    });

    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe("weather");
    expect(parsed[0].eligible).toBe(true);
  });

  it("returns empty array for malformed payload", () => {
    expect(parseOpenClawSkillsPayload(null)).toEqual([]);
    expect(parseOpenClawSkillsPayload({})).toEqual([]);
    expect(parseOpenClawSkillsPayload({ skills: "nope" })).toEqual([]);
  });
});
