export type Env = {
  APP_ENV?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_STARTER_PRICE_ID?: string;
  CF_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_BASE_URL?: string;
  DEFAULT_MODEL_PROVIDER?: string;
  DEFAULT_MODEL_ID?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  RUN_QUEUE: Queue;
  AGENT_SESSION: DurableObjectNamespace;
};
