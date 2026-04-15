import { describe, expect, it } from "vitest";
import { calculateModelCosts } from "./calculator";
import { MODEL_PRICING } from "./pricing";

describe("calculateModelCosts", () => {
  it("calculates exact and estimated token costs and sorts by total cost", () => {
    const results = calculateModelCosts({
      prompt: "Summarize quarterly operations results for the executive team today.",
      output:
        "Revenue rose 12 percent, backlog shrank, support replies accelerated, and retention stayed above target.",
      pricing: MODEL_PRICING,
    });

    const openAiMini = results.find((result) => result.modelId === "openai-gpt-4.1-mini");
    const anthropicHaiku = results.find(
      (result) => result.modelId === "anthropic-claude-3-5-haiku"
    );

    expect(openAiMini).toMatchObject({
      tokenStrategy: "estimated",
      inputTokens: 14,
      outputTokens: 21,
    });
    expect(openAiMini?.totalCostUsd).toBeCloseTo(0.0000455, 10);

    expect(anthropicHaiku).toMatchObject({
      tokenStrategy: "estimated",
      inputTokens: 14,
      outputTokens: 21,
    });
    expect(anthropicHaiku?.totalCostUsd).toBeCloseTo(0.0000952, 10);

    expect(results.map((result) => result.totalCostUsd)).toEqual(
      [...results.map((result) => result.totalCostUsd)].sort((left, right) => left - right)
    );
  });
});
