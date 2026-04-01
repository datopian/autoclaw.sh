import type { Env } from "../../types";
import { requireDb } from "../../db/client";
import { createSubscriptionRepository } from "../../db/repositories/subscriptions";
import { json, methodNotAllowed } from "../../lib/http";
import { verifyStripeWebhookSignature } from "../../services/stripe-webhook";

type StripeEvent = {
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

function planCodeFromPriceId(
  priceId: string | null | undefined,
  env: Env
): string {
  if (!priceId) {
    return "starter";
  }
  if (!env.STRIPE_STARTER_PRICE_ID || priceId === env.STRIPE_STARTER_PRICE_ID) {
    return "starter";
  }
  return "starter";
}

function readTenantId(source: Record<string, unknown>): string | null {
  const metadata = source.metadata as Record<string, unknown> | undefined;
  const fromMetadata =
    typeof metadata?.tenant_id === "string" ? metadata.tenant_id : null;
  const fromClientRef =
    typeof source.client_reference_id === "string"
      ? source.client_reference_id
      : null;
  return fromMetadata ?? fromClientRef;
}

async function persistSubscriptionEvent(
  event: StripeEvent,
  env: Env
): Promise<void> {
  const object = (event.data?.object ?? {}) as Record<string, unknown>;
  const subscriptions = createSubscriptionRepository(requireDb(env));

  if (event.type === "checkout.session.completed") {
    const tenantId = readTenantId(object);
    const stripeCustomerId =
      typeof object.customer === "string" ? object.customer : null;
    const stripeSubscriptionId =
      typeof object.subscription === "string" ? object.subscription : null;
    const priceId =
      typeof object.price === "string"
        ? object.price
        : (object.display_items as Array<{ price?: { id?: string } }> | undefined)?.[0]
            ?.price?.id ?? null;
    if (!tenantId || !stripeSubscriptionId) {
      return;
    }

    await subscriptions.upsertFromStripe({
      tenantId,
      stripeCustomerId,
      stripeSubscriptionId,
      planCode: planCodeFromPriceId(priceId, env),
      status: "active"
    });
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const tenantId = readTenantId(object);
    const stripeCustomerId =
      typeof object.customer === "string" ? object.customer : null;
    const stripeSubscriptionId = typeof object.id === "string" ? object.id : null;
    const status = typeof object.status === "string" ? object.status : "inactive";
    const items = object.items as
      | { data?: Array<{ price?: { id?: string } }> }
      | undefined;
    const priceId = items?.data?.[0]?.price?.id ?? null;

    if (!tenantId || !stripeSubscriptionId) {
      return;
    }

    await subscriptions.upsertFromStripe({
      tenantId,
      stripeCustomerId,
      stripeSubscriptionId,
      planCode: planCodeFromPriceId(priceId, env),
      status
    });
  }
}

export async function handleStripeWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "invalid signature" }, 401);
  }

  const rawBody = await request.text();
  const verified = await verifyStripeWebhookSignature({
    rawBody,
    header: signature,
    secret: env.STRIPE_WEBHOOK_SECRET
  });

  if (!verified) {
    return json({ error: "invalid signature" }, 401);
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  await persistSubscriptionEvent(event, env);

  return json({ received: true });
}
