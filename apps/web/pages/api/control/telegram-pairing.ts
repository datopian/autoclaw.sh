import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "./_worker";
import { requireAuth } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireAuth(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const query = `?tenantId=${encodeURIComponent(user.tenantId)}`;
  const body =
    req.method === "POST"
      ? JSON.stringify({ ...(req.body as Record<string, unknown>), tenantId: user.tenantId })
      : undefined;
  const response = await fetch(`${workerBaseUrl()}/api/telegram/pairing${query}`, {
    method: req.method,
    headers: { "content-type": "application/json" },
    body
  });

  const payload = await response.text();
  res.status(response.status).send(payload);
}
