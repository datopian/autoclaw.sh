import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "../control/_worker";
import { setSessionCookie } from "./_cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const response = await fetch(`${workerBaseUrl()}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req.body)
  });
  const raw = await response.text();
  let payload: {
    sessionToken?: string;
    user?: unknown;
    error?: string;
  } = {};
  try {
    payload = JSON.parse(raw) as {
      sessionToken?: string;
      user?: unknown;
      error?: string;
    };
  } catch {
    payload = {
      error: raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240)
    };
  }
  if (!response.ok || !payload.sessionToken) {
    return res.status(response.status).json(payload);
  }
  setSessionCookie(req, res, payload.sessionToken);
  return res.status(200).json({ ok: true, user: payload.user });
}
