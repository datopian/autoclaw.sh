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

  const response = await fetch(
    `${workerBaseUrl()}/api/tenants`
  );
  if (!response.ok) {
    const payload = await response.text();
    return res.status(response.status).send(payload);
  }
  const payload = (await response.json()) as {
    tenants?: Array<{ id: string } & Record<string, unknown>>;
  };
  const tenant = payload.tenants?.find((item) => item.id === user.tenantId) ?? null;
  if (!tenant) {
    return res.status(200).json({ tenant: null });
  }
  return res.status(200).json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      status: tenant.status,
      modelProvider: tenant.modelProvider ?? null,
      modelId: tenant.modelId ?? null,
      hasApiKey: Boolean(tenant.byokApiKey)
    }
  });
}
