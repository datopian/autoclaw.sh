import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "./_worker";
import { requireAuth } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method ?? "")) {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const isGet = req.method === "GET";
  const response = await fetch(
    `${workerBaseUrl()}/api/workspaces/skills${isGet ? `?tenantId=${encodeURIComponent(user.tenantId)}` : ""}`,
    {
      method: req.method,
      headers: { "content-type": "application/json" },
      body: isGet
        ? undefined
        : JSON.stringify({ ...(req.body as Record<string, unknown>), tenantId: user.tenantId })
    }
  );

  const payload = await response.text();
  res.status(response.status).send(payload);
}
