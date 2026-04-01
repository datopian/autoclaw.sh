import type { NextApiRequest, NextApiResponse } from "next";
import { workerBaseUrl } from "../control/_worker";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const response = await fetch(`${workerBaseUrl()}/api/auth/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req.body)
  });

  const payload = await response.text();
  res.status(response.status).send(payload);
}
