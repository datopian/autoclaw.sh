import type { Sandbox } from "@cloudflare/sandbox";

export type Env = {
  APP_ENV?: string;
  MEMORY_RETENTION_DAYS?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_STARTER_PRICE_ID?: string;
  CF_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_BASE_URL?: string;
  OPENCLAW_SANDBOX_SLEEP_AFTER?: string;
  DEFAULT_MODEL_PROVIDER?: string;
  DEFAULT_MODEL_ID?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_RUNTIME_MODE?: string;
  TELEGRAM_RUNTIME_ALLOWLIST?: string;
  TELEGRAM_RUNTIME_FALLBACK_DIRECT?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  RUNTIME_BACKFILL_TOKEN?: string;
  DB: D1Database;
  AI?: {
    run: (model: string, inputs: unknown) => Promise<unknown>;
  };
  ARTIFACTS: R2Bucket;
  RUN_QUEUE: Queue;
  MEMORY_INGEST_QUEUE: Queue;
  MEMORY_DISTILL_QUEUE: Queue;
  AGENT_SESSION: DurableObjectNamespace;
  Sandbox?: DurableObjectNamespace<Sandbox>;
};
