import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "./_worker";
import { requireAuth } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const query = `?tenantId=${encodeURIComponent(user.tenantId)}`;
  const response = await fetch(`${workerBaseUrl()}/api/subscriptions${query}`);
  const payload = await response.text();
  res.status(response.status).send(payload);
}
