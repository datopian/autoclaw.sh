import type { ModelPricing, TokenStrategy } from "./pricing";

const TOKENS_PER_MILLION = 1_000_000;
// 1 token ≈ 4 characters
const CHARS_PER_TOKEN = 4;

export type CostCalculationInput = {
  prompt: string;
  output: string;
  pricing: ModelPricing[];
};

export type CostCalculationResult = {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  tokenizerLabel: string;
  tokenizerEstimateDetail: string;
  tokenizerSourceLabel: string;
  tokenizerSourceUrl: string;
  tokenStrategy: TokenStrategy;
  inputTokens: number;
  outputTokens: number;
  inputCostPerMillionUsd: number;
  outputCostPerMillionUsd: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
};

export function countTokens(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function countTokensByStrategy(text: string, tokenStrategy: TokenStrategy): number {
  if (tokenStrategy === "exact") {
    return countTokens(text);
  }

  return countTokens(text);
}

export function calculateModelCosts({
  prompt,
  output,
  pricing,
}: CostCalculationInput): CostCalculationResult[] {
  return pricing
    .map((model) => {
      const inputTokens = countTokensByStrategy(prompt, model.tokenStrategy);
      const outputTokens = countTokensByStrategy(output, model.tokenStrategy);
      const inputCostUsd = (inputTokens * model.inputCostPerMillionUsd) / TOKENS_PER_MILLION;
      const outputCostUsd = (outputTokens * model.outputCostPerMillionUsd) / TOKENS_PER_MILLION;

      return {
        providerId: model.providerId,
        providerLabel: model.providerLabel,
        modelId: model.modelId,
        modelLabel: model.modelLabel,
        tokenizerLabel: model.tokenizerLabel,
        tokenizerEstimateDetail: model.tokenizerEstimateDetail,
        tokenizerSourceLabel: model.tokenizerSourceLabel,
        tokenizerSourceUrl: model.tokenizerSourceUrl,
        tokenStrategy: model.tokenStrategy,
        inputTokens,
        outputTokens,
        inputCostPerMillionUsd: model.inputCostPerMillionUsd,
        outputCostPerMillionUsd: model.outputCostPerMillionUsd,
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
