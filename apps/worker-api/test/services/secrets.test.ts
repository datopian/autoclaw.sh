import { describe, expect, it } from "vitest";
import { maskSecret, normalizeProvider, requireApiKey } from "../../src/services/secrets";

describe("secrets service", () => {
  it("normalizes supported providers", () => {
    expect(normalizeProvider("OPENAI")).toBe("openai");
    expect(normalizeProvider("anthropic")).toBe("anthropic");
  });

  it("throws for unsupported providers", () => {
    expect(() => normalizeProvider("unknown")).toThrowError("Unsupported model provider");
  });

  it("requires non-empty api key", () => {
    expect(() => requireApiKey("  ")).toThrowError("Missing BYOK API key");
    expect(requireApiKey(" sk-live-1 ")).toBe("sk-live-1");
  });

  it("masks secrets for logs", () => {
    expect(maskSecret("1234567890")).toBe("12******90");
  });
});
