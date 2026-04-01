import { describe, expect, it } from "vitest";
import {
  createEmbeddingClient,
  DEFAULT_CF_EMBEDDING_MODEL,
  LOCAL_FALLBACK_EMBEDDING_MODEL
} from "../../src/services/embeddings";
import type { Env } from "../../src/types";

describe("embedding client", () => {
  it("uses local fallback model when AI binding is missing", async () => {
    const client = createEmbeddingClient({} as Env);
    expect(client.model).toBe(LOCAL_FALLBACK_EMBEDDING_MODEL);
    const vector = await client.embed("hello world");
    expect(vector.length).toBeGreaterThan(0);
  });

  it("uses cloudflare workers ai when AI binding exists", async () => {
    const calls: Array<{ model: string; text: unknown }> = [];
    const env = {
      AI: {
        run: async (model: string, inputs: { text: string }) => {
          calls.push({ model, text: inputs.text });
          return { data: [[0.25, -0.5, 0.75]] };
        }
      }
    } as unknown as Env;

    const client = createEmbeddingClient(env);
    expect(client.model).toBe(DEFAULT_CF_EMBEDDING_MODEL);
    const vector = await client.embed("memory text");
    expect(calls.length).toBe(1);
    expect(calls[0].model).toBe(DEFAULT_CF_EMBEDDING_MODEL);
    expect(vector).toEqual([0.25, -0.5, 0.75]);
  });
});
