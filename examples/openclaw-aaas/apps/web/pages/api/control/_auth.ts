import type { NextApiRequest } from "next";
import { workerBaseUrl } from "./_worker";
import { readSessionCookie } from "../auth/_cookie";

export type AuthenticatedUser = {
  accountId: string;
  tenantId: string;
  email: string;
  name: string;
};

export async function requireAuth(req: NextApiRequest): Promise<AuthenticatedUser | null> {
  const token = readSessionCookie(req);
  if (!token) {
    return null;
  }

  const response = await fetch(`${workerBaseUrl()}/api/auth/me`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    authenticated?: boolean;
    user?: AuthenticatedUser;
  };
  if (!payload.authenticated || !payload.user) {
    return null;
  }
  return payload.user;
}
