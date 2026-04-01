import type { Env } from "../types";

export const DEFAULT_CF_EMBEDDING_MODEL = "@cf/baai/bge-m3";
export const LOCAL_FALLBACK_EMBEDDING_MODEL = "local-lexical-v1";

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildLocalEmbedding(text: string, dimensions = 64): number[] {
  const out = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    const h = hashString(token);
    const index = h % dimensions;
    const sign = h & 1 ? 1 : -1;
    out[index] += sign;
  }

  const norm = Math.sqrt(out.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return out;
  }
  return out.map((value) => Number((value / norm).toFixed(6)));
}

function extractEmbeddingVector(payload: unknown): number[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = payload as {
    data?: unknown;
    response?: unknown;
  };

  if (
    Array.isArray(candidate.data) &&
    candidate.data.length > 0 &&
    Array.isArray(candidate.data[0])
  ) {
    const first = candidate.data[0];
    if (first.every((item) => typeof item === "number")) {
      return first as number[];
    }
  }

  if (
    Array.isArray(candidate.response) &&
    candidate.response.length > 0 &&
    Array.isArray(candidate.response[0])
  ) {
    const first = candidate.response[0];
    if (first.every((item) => typeof item === "number")) {
      return first as number[];
    }
  }

  return null;
}

export function createEmbeddingClient(env: Env): {
  model: string;
  embed: (text: string) => Promise<number[]>;
} {
  if (!env.AI) {
    return {
      model: LOCAL_FALLBACK_EMBEDDING_MODEL,
      async embed(text: string) {
        return buildLocalEmbedding(text);
      }
    };
  }

  const ai = env.AI;
  return {
    model: DEFAULT_CF_EMBEDDING_MODEL,
    async embed(text: string) {
      const payload = await ai.run(DEFAULT_CF_EMBEDDING_MODEL, { text });
      const vector = extractEmbeddingVector(payload);
      if (!vector || vector.length === 0) {
        throw new Error("cloudflare embedding output missing vector data");
      }
      return vector;
    }
  };
}
