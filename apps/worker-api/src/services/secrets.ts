export type SupportedProvider = "openai" | "anthropic";

export function normalizeProvider(input: string): SupportedProvider {
  const provider = input.trim().toLowerCase();
  if (provider === "openai" || provider === "anthropic") {
    return provider;
  }

  throw new Error("Unsupported model provider");
}

export function requireApiKey(value: string | undefined): string {
  const key = value?.trim();
  if (!key) {
    throw new Error("Missing BYOK API key");
  }

  return key;
}

export function maskSecret(value: string): string {
  if (value.length <= 4) {
    return "****";
  }

  const head = value.slice(0, 2);
  const tail = value.slice(-2);
  return `${head}${"*".repeat(Math.max(1, value.length - 4))}${tail}`;
}
