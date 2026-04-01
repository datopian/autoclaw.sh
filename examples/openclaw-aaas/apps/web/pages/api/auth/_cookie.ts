import type { NextApiRequest, NextApiResponse } from "next";

export const SESSION_COOKIE_NAME = "openclaw_session";

function isSecure(req: NextApiRequest): boolean {
  const proto = req.headers["x-forwarded-proto"];
  return proto === "https" || process.env.NODE_ENV === "production";
}

export function setSessionCookie(
  req: NextApiRequest,
  res: NextApiResponse,
  token: string
): void {
  const secure = isSecure(req);
  const cookie = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000",
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(req: NextApiRequest, res: NextApiResponse): void {
  const secure = isSecure(req);
  const cookie = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function readSessionCookie(req: NextApiRequest): string {
  const raw = req.headers.cookie ?? "";
  const parts = raw.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(part.slice(`${SESSION_COOKIE_NAME}=`.length));
    }
  }
  return "";
}
