import { json } from "../lib/http";
import type { Env } from "../types";

type ExecuteMessage = {
  runId?: string;
  tenantId?: string;
  templateId?: string;
};

export class AgentSession {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/v1/execute") {
      return json({ error: "Not found" }, 404);
    }

    const payload = (await request.json()) as ExecuteMessage;
    if (!payload.runId || !payload.tenantId || !payload.templateId) {
      return json({ error: "invalid payload" }, 400);
    }

    // DO instance acts as a per-agent coordinator key. Keep a small state trail.
    await this.state.storage.put("lastRun", {
      runId: payload.runId,
      at: new Date().toISOString()
    });

    return json({ ok: true, runId: payload.runId }, 200);
  }
}
