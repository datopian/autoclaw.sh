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
    throw new Error(`AI Gateway call failed: ${response.status} ${text}`);
  }

  return response.json();
}
