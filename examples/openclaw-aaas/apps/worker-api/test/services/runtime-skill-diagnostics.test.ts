import { describe, expect, it } from "vitest";
import {
  buildRuntimeSkillDiagnostics,
  buildRuntimeSkillRemediationChanges
} from "../../src/services/runtime-skill-diagnostics";

describe("runtime skill diagnostics", () => {
  const skills = [
    {
      name: "weather",
      eligible: true,
      disabled: false,
      blockedByAllowlist: false,
      effectiveReady: true,
      missing: null,
      policy: { allowed: true, enabled: true, hidden: false }
    },
    {
      name: "openai-whisper-api",
      eligible: false,
      disabled: false,
      blockedByAllowlist: false,
      effectiveReady: false,
      missing: { env: ["OPENAI_API_KEY"] },
      policy: { allowed: true, enabled: true, hidden: false }
    }
  ];

  it("builds diagnostics summary", () => {
    const diagnostics = buildRuntimeSkillDiagnostics(skills);
    expect(diagnostics.total).toBe(2);
    expect(diagnostics.ready).toBe(1);
    expect(diagnostics.unavailable).toBe(1);
    expect(diagnostics.withMissingRequirements).toBe(1);
  });

  it("builds hide_unavailable remediation changes", () => {
    const changes = buildRuntimeSkillRemediationChanges({
      skills,
      strategy: "hide_unavailable"
    });
    expect(changes.length).toBe(1);
    expect(changes[0].name).toBe("openai-whisper-api");
    expect(changes[0].enabled).toBe(false);
    expect(changes[0].hidden).toBe(true);
  });
});
