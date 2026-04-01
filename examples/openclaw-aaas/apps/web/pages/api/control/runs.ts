import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "./_worker";
import { requireAuth } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireAuth(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const body = { ...(req.body as Record<string, unknown>), tenantId: user.tenantId };

  const response = await fetch(`${workerBaseUrl()}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.text();
  res.status(response.status).send(payload);
}
