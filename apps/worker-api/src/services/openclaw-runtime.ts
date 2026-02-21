import { requireDb } from "../db/client";
import { createTenantOpenClawRuntimeRepository } from "../db/repositories/openclaw-runtime";
import { createTenantRepository } from "../db/repositories/tenants";
import type { Env } from "../types";

const GATEWAY_PORT = 18789;
const STARTUP_TIMEOUT_MS = 120_000;
const GATEWAY_COMMAND = "/usr/local/bin/start-openclaw.sh";

type SandboxLike = {
  listProcesses: () => Promise<Array<{ id: string; status: string; command: string }>>;
  exec: (command: string) => Promise<unknown>;
  startProcess: (
    command: string,
    options?: { env?: Record<string, string> }
  ) => Promise<{
    waitForPort: (port: number, options: { mode: "tcp"; timeout: number }) => Promise<void>;
  }>;
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function buildSandboxPath(relativePath: string): string | null {
  const clean = relativePath.trim().replace(/^\/+/, "");
  if (!clean || clean.includes("..")) {
    return null;
  }
  return `/root/clawd/${clean}`;
}

function parseSleepAfter(value: string): { keepAlive?: boolean; sleepAfter?: string } {
  if (value === "never") {
    return { keepAlive: true };
  }
  return { sleepAfter: value };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function workspacePrefixForTenant(tenantId: string): string {
  return `tenant/${tenantId}/openclaw/workspace`;
}

async function listAllKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await bucket.list({ prefix, cursor });
    keys.push(...page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

async function syncWorkspaceFromR2(input: {
  sandbox: SandboxLike;
  bucket: R2Bucket;
  workspacePrefix: string;
}): Promise<void> {
  const keys = await listAllKeys(input.bucket, `${input.workspacePrefix}/`);
  for (const key of keys) {
    const relative = key.slice(input.workspacePrefix.length + 1);
    const sandboxPath = buildSandboxPath(relative);
    if (!sandboxPath) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const object = await input.bucket.get(key);
    if (!object) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const encoded = bytesToBase64(new Uint8Array(await object.arrayBuffer()));
    const parentPath = sandboxPath.slice(0, sandboxPath.lastIndexOf("/"));
    const command = `mkdir -p ${shellQuote(parentPath)} && printf '%s' ${shellQuote(encoded)} | base64 -d > ${shellQuote(sandboxPath)}`;
    // eslint-disable-next-line no-await-in-loop
    await input.sandbox.exec(command);
  }
}

async function findGatewayProcess(sandbox: SandboxLike): Promise<{ id: string; status: string } | null> {
  const processes = await sandbox.listProcesses();
  const process = processes.find((item) => {
    if (item.command.includes("openclaw gateway") || item.command.includes("start-openclaw.sh")) {
      return item.status === "running" || item.status === "starting";
    }
    return false;
  });
  return process
    ? {
        id: process.id,
        status: process.status
      }
    : null;
}

async function getTenantSandbox(input: {
  namespace: NonNullable<Env["Sandbox"]>;
  tenantId: string;
  sleepAfter: string;
}): Promise<SandboxLike> {
  const sandboxModule = await import("@cloudflare/sandbox");
  return sandboxModule.getSandbox(
    input.namespace,
    `tenant:${input.tenantId}`,
    parseSleepAfter(input.sleepAfter)
  ) as SandboxLike;
}

export async function ensureTenantOpenClawRuntime(
  env: Env,
  tenantId: string
): Promise<{ started: boolean; reason: string }> {
  if (!env.Sandbox) {
    return {
      started: false,
      reason: "sandbox binding is not configured"
    };
  }

  const db = requireDb(env);
  const runtimes = createTenantOpenClawRuntimeRepository(db);
  const tenants = createTenantRepository(db);
  const runtime = await runtimes.findByTenantId(tenantId);
  if (!runtime) {
    return {
      started: false,
      reason: "runtime record not found"
    };
  }

  const tenant = await tenants.findById(tenantId);
  if (!tenant) {
    return {
      started: false,
      reason: "tenant not found"
    };
  }

  const expectedPrefix = workspacePrefixForTenant(tenantId);
  if (runtime.workspacePrefix !== expectedPrefix) {
    await runtimes.setStatus(tenantId, "failed");
    return {
      started: false,
      reason: "workspace prefix does not match tenant"
    };
  }

  const gatewayToken = await runtimes.ensureGatewayToken(tenantId);
  const sandbox = await getTenantSandbox({
    namespace: env.Sandbox,
    tenantId,
    sleepAfter: runtime.sleepAfter
  });
  const existing = await findGatewayProcess(sandbox);
  if (existing) {
    await runtimes.setStatus(tenantId, "running");
    return {
      started: false,
      reason: "gateway already running"
    };
  }

  const markedStarting = await runtimes.tryMarkStarting(tenantId);
  if (!markedStarting) {
    const afterLockAttempt = await runtimes.findByTenantId(tenantId);
    const processAfterLockAttempt = await findGatewayProcess(sandbox);
    if (!processAfterLockAttempt && afterLockAttempt?.status === "starting") {
      await runtimes.setStatus(tenantId, "failed");
      const recovered = await runtimes.tryMarkStarting(tenantId);
      if (!recovered) {
        return {
          started: false,
          reason: "gateway is already starting"
        };
      }
    } else {
      return {
        started: false,
        reason: "gateway is already starting"
      };
    }
  }

  try {
    await syncWorkspaceFromR2({
      sandbox,
      bucket: env.ARTIFACTS,
      workspacePrefix: runtime.workspacePrefix
    });

    const processEnv: Record<string, string> = {
      OPENCLAW_GATEWAY_PORT: String(GATEWAY_PORT),
      OPENCLAW_GATEWAY_TOKEN: gatewayToken
    };
    if (tenant.modelProvider === "openai" && tenant.byokApiKey) {
      processEnv.OPENAI_API_KEY = tenant.byokApiKey;
    }
    if (tenant.modelProvider === "anthropic" && tenant.byokApiKey) {
      processEnv.ANTHROPIC_API_KEY = tenant.byokApiKey;
    }
    if (tenant.modelProvider === "google" && tenant.byokApiKey) {
      processEnv.GEMINI_API_KEY = tenant.byokApiKey;
    }

    const process = await sandbox.startProcess(GATEWAY_COMMAND, {
      env: processEnv
    });
    await process.waitForPort(GATEWAY_PORT, {
      mode: "tcp",
      timeout: STARTUP_TIMEOUT_MS
    });
    await runtimes.setStatus(tenantId, "running");
    return {
      started: true,
      reason: "gateway started"
    };
  } catch (error) {
    await runtimes.setStatus(tenantId, "failed");
    throw error;
  }
}
