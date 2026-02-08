import { describe, expect, it } from "vitest";
import { buildAIGatewayRequest, defaultAIGatewayBaseUrl } from "../../src/services/ai-gateway";

describe("ai gateway", () => {
  it("builds a provider routed gateway request", () => {
    const request = buildAIGatewayRequest({
      accountId: "acc_123",
      gatewayId: "gw_123",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "sk-key",
      prompt: "Say hello"
    });

    expect(request.url).toContain("/acc_123/ai-gateway/gw_123/openai/v1/chat/completions");
    expect(request.headers["authorization"]).toBe("Bearer sk-key");
    expect(request.body.model).toBe("gpt-4o-mini");
  });

  it("uses cloudflare default base url", () => {
    expect(defaultAIGatewayBaseUrl()).toBe("https://gateway.ai.cloudflare.com/v1");
  });
});
