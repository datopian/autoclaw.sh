import type { Env } from "../types";

export function requireDb(env: Env): D1Database {
  if (!env.DB) {
    throw new Error("D1 database binding `DB` is not configured");
  }

  return env.DB;
}
