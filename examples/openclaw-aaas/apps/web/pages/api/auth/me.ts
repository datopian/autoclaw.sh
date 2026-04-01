import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "../control/_worker";
import { readSessionCookie } from "./_cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = readSessionCookie(req);
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const response = await fetch(`${workerBaseUrl()}/api/auth/me`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` }
  });
  const payload = await response.text();
  res.status(response.status).send(payload);
}
