import { describe, expect, it } from "vitest";
import { verifyStripeWebhookSignature } from "../../src/services/stripe-webhook";

async function buildSignature(input: {
  timestamp: string;
  body: string;
  secret: string;
}): Promise<string> {
  const encoder = new TextEncoder();
  const payload = `${input.timestamp}.${input.body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${input.timestamp},v1=${hex}`;
}

describe("stripe webhook signature", () => {
  it("verifies valid signature", async () => {
    const body = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
    const secret = "whsec_test_secret";
    const timestamp = "1739030400";
    const header = await buildSignature({ timestamp, body, secret });

    await expect(
      verifyStripeWebhookSignature({
        rawBody: body,
        header,
        secret
      })
    ).resolves.toBe(true);
  });

  it("rejects invalid signature", async () => {
    const body = JSON.stringify({ id: "evt_1", type: "invoice.paid" });

    await expect(
      verifyStripeWebhookSignature({
        rawBody: body,
        header: "t=1739030400,v1=badsignature",
        secret: "whsec_test_secret"
      })
    ).resolves.toBe(false);
  });
});
