const encoder = new TextEncoder();

type StripeSignatureParts = {
  timestamp: string;
  signatures: string[];
};

function parseStripeSignatureHeader(header: string): StripeSignatureParts {
  const parts = header.split(",").map((part) => part.trim());
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) {
      continue;
    }
    if (key === "t") {
      timestamp = value;
    }
    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe signature header format");
  }

  return { timestamp, signatures };
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex signature");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBytes = hexToBytes(a);
  const bBytes = hexToBytes(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyStripeWebhookSignature(input: {
  rawBody: string;
  header: string;
  secret: string;
}): Promise<boolean> {
  try {
    const { timestamp, signatures } = parseStripeSignatureHeader(input.header);
    const signedPayload = `${timestamp}.${input.rawBody}`;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(input.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expected = bytesToHex(digest);

    return signatures.some((signature) => timingSafeEqualHex(signature, expected));
  } catch {
    return false;
  }
}
