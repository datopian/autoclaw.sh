import fs from "node:fs/promises";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";

const storePath = path.join(process.cwd(), "data", "waitlist.jsonl");

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, segment } = req.body as { email?: string; segment?: string };
  if (!email || !validEmail(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const payload = {
    email: email.toLowerCase(),
    segment: segment ?? "unknown",
    createdAt: new Date().toISOString()
  };

  try {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.appendFile(storePath, `${JSON.stringify(payload)}\n`, "utf8");
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to persist waitlist entry" });
  }
}
