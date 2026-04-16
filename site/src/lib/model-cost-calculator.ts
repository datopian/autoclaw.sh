import type { ModelPricing } from "../data/model-pricing";

const TOKENS_PER_MILLION = 1_000_000;
// 1 token ≈ 4 characters
const CHARS_PER_TOKEN = 4;

export type ModelCostResult = {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  inputCostPerMillionUsd: number;
  outputCostPerMillionUsd: number;
  inputTokens: number;
  outputTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
};

export function countTokens(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function calculateModelCosts(
  prompt: string,
  output: string,
  pricing: ModelPricing[]
): ModelCostResult[] {
  return pricing.map((model) => {
    const inputTokens = countTokens(prompt);
    const outputTokens = countTokens(output);
    const inputCostUsd = (inputTokens * model.inputCostPerMillionUsd) / TOKENS_PER_MILLION;
    const outputCostUsd = (outputTokens * model.outputCostPerMillionUsd) / TOKENS_PER_MILLION;

    return {
      providerId: model.providerId,
      providerLabel: model.providerLabel,
      modelId: model.modelId,
      modelLabel: model.modelLabel,
      inputCostPerMillionUsd: model.inputCostPerMillionUsd,
      outputCostPerMillionUsd: model.outputCostPerMillionUsd,
      inputTokens,
      outputTokens,
      inputCostUsd,
      outputCostUsd,
      totalCostUsd: inputCostUsd + outputCostUsd,
    };
  });
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(value);
}
