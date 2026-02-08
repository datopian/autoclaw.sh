import { describe, expect, it, vi } from "vitest";
import { createRunOrchestrator } from "../../src/services/run-orchestrator";

describe("run orchestrator", () => {
  it("marks run as succeeded when durable object execution succeeds", async () => {
    const markRunning = vi.fn(async () => {});
    const markSucceeded = vi.fn(async () => {});
    const markFailed = vi.fn(async () => {});

    const env = {
      AGENT_SESSION: {
        idFromName: vi.fn(() => "id"),
        get: vi.fn(() => ({
          fetch: vi.fn(async () =>
            new Response(JSON.stringify({ ok: true }), { status: 200 })
          )
        }))
      }
    } as unknown as Parameters<typeof createRunOrchestrator>[0]["env"];

    const orchestrator = createRunOrchestrator({
      env,
      runs: {
        markRunning,
        markSucceeded,
        markFailed
      }
    });

    await orchestrator.process({
      runId: "run_1",
      tenantId: "tenant_1",
      templateId: "support-agent"
    });

    expect(markRunning).toHaveBeenCalledWith("run_1");
    expect(markSucceeded).toHaveBeenCalledWith("run_1");
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("marks run as failed when durable object execution fails", async () => {
    const markRunning = vi.fn(async () => {});
    const markSucceeded = vi.fn(async () => {});
    const markFailed = vi.fn(async () => {});

    const env = {
      AGENT_SESSION: {
        idFromName: vi.fn(() => "id"),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response("boom", { status: 500 }))
        }))
      }
    } as unknown as Parameters<typeof createRunOrchestrator>[0]["env"];

    const orchestrator = createRunOrchestrator({
      env,
      runs: {
        markRunning,
        markSucceeded,
        markFailed
      }
    });

    await orchestrator.process({
      runId: "run_1",
      tenantId: "tenant_1",
      templateId: "support-agent"
    });

    expect(markRunning).toHaveBeenCalledWith("run_1");
    expect(markSucceeded).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalled();
  });

  it("calls AI gateway when BYOK payload is provided", async () => {
    const markRunning = vi.fn(async () => {});
    const markSucceeded = vi.fn(async () => {});
    const markFailed = vi.fn(async () => {});
    const invokeGateway = vi.fn(async () => ({}));

    const env = {
      CF_ACCOUNT_ID: "acc_123",
      AI_GATEWAY_ID: "gw_123",
      AGENT_SESSION: {
        idFromName: vi.fn(() => "id"),
        get: vi.fn(() => ({
          fetch: vi.fn(async () =>
            new Response(JSON.stringify({ ok: true }), { status: 200 })
          )
        }))
      }
    } as unknown as Parameters<typeof createRunOrchestrator>[0]["env"];

    const orchestrator = createRunOrchestrator({
      env,
      runs: {
        markRunning,
        markSucceeded,
        markFailed
      },
      invokeGateway
    });

    await orchestrator.process({
      runId: "run_1",
      tenantId: "tenant_1",
      templateId: "support-agent",
      byok: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-123"
      }
    });

    expect(invokeGateway).toHaveBeenCalledTimes(1);
    expect(markSucceeded).toHaveBeenCalledWith("run_1");
  });
});
