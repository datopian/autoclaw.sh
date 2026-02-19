import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "../control/_worker";
import { clearSessionCookie, readSessionCookie } from "./_cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = readSessionCookie(req);
  if (token) {
    await fetch(`${workerBaseUrl()}/api/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });
  }
  clearSessionCookie(req, res);
  return res.status(200).json({ ok: true });
}
