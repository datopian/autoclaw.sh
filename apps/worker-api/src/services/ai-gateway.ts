import type { SupportedProvider } from "./secrets";

export type GatewayRequestInput = {
  accountId: string;
  gatewayId: string;
  provider: SupportedProvider;
  model: string;
  apiKey: string;
  prompt: string;
  baseUrl?: string;
};

export type GatewayRequest = {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    messages: Array<{ role: "user"; content: string }>;
  };
};

export function defaultAIGatewayBaseUrl(): string {
  return "https://gateway.ai.cloudflare.com/v1";
}

export function buildAIGatewayRequest(input: GatewayRequestInput): GatewayRequest {
  const root = (input.baseUrl ?? defaultAIGatewayBaseUrl()).replace(/\/$/, "");
  const url = `${root}/${input.accountId}/ai-gateway/${input.gatewayId}/${input.provider}/v1/chat/completions`;

  return {
    url,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.apiKey}`
    },
    body: {
      model: input.model,
      messages: [{ role: "user", content: input.prompt }]
    }
  };
}

export async function invokeAIGateway(input: GatewayRequestInput): Promise<unknown> {
  const request = buildAIGatewayRequest(input);

  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    const text = await response.text();
    if (
      response.status === 400 &&
      text.includes("Please configure AI Gateway in the Cloudflare dashboard")
    ) {
      return invokeProviderDirect(input);
    }
    throw new Error(`AI Gateway call failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function invokeProviderDirect(input: GatewayRequestInput): Promise<unknown> {
  if (input.provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: "user", content: input.prompt }]
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI direct call failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  if (input.provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: input.prompt }]
      })
    });
    if (!response.ok) {
      throw new Error(
        `Anthropic direct call failed: ${response.status} ${await response.text()}`
      );
    }
    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      payload.content
        ?.filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => item.text as string)
        .join("\n")
        .trim() ?? "";
    return { choices: [{ message: { content: text } }] };
  }

  if (input.provider === "google") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: input.prompt }] }]
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Gemini direct call failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => (typeof part.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n")
        .trim() ?? "";
    return { choices: [{ message: { content: text } }] };
  }

  throw new Error("Unsupported provider for direct fallback");
}
