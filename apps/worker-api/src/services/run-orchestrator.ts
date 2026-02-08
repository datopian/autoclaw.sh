import type { Env } from "../types";
import { invokeAIGateway } from "./ai-gateway";
import { normalizeProvider, requireApiKey } from "./secrets";

export type RunQueueMessage = {
  runId: string;
  tenantId: string;
  templateId: string;
  byok?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    prompt?: string;
  };
};

type RunRepository = {
  markRunning: (runId: string) => Promise<void>;
  markSucceeded: (runId: string) => Promise<void>;
  markFailed: (runId: string, errorMessage: string) => Promise<void>;
};

type AIGatewayInvoker = typeof invokeAIGateway;

export function createRunOrchestrator(input: {
  env: Env;
  runs: RunRepository;
  invokeGateway?: AIGatewayInvoker;
}) {
  const callGateway = input.invokeGateway ?? invokeAIGateway;
  return {
    async process(message: RunQueueMessage): Promise<void> {
      await input.runs.markRunning(message.runId);

      try {
        if (message.byok?.apiKey) {
          const accountId = input.env.CF_ACCOUNT_ID;
          const gatewayId = input.env.AI_GATEWAY_ID;
          if (!accountId || !gatewayId) {
            throw new Error("AI Gateway env is not configured");
          }

          await callGateway({
            accountId,
            gatewayId,
            baseUrl: input.env.AI_GATEWAY_BASE_URL,
            provider: normalizeProvider(
              message.byok.provider ?? input.env.DEFAULT_MODEL_PROVIDER ?? "openai"
            ),
            model: message.byok.model ?? input.env.DEFAULT_MODEL_ID ?? "gpt-4o-mini",
            apiKey: requireApiKey(message.byok.apiKey),
            prompt:
              message.byok.prompt ??
              `Execute ${message.templateId} for tenant ${message.tenantId}`
          });
        }

        const durableId = input.env.AGENT_SESSION.idFromName(
          `${message.tenantId}:${message.templateId}`
        );
        const stub = input.env.AGENT_SESSION.get(durableId);

        const response = await stub.fetch("https://agent-session/v1/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(message)
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`agent session rejected run: ${body || response.status}`);
        }

        await input.runs.markSucceeded(message.runId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        await input.runs.markFailed(message.runId, reason);
      }
    }
  };
}
