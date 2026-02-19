export type TenantInput = {
  name: string;
  email: string;
};

export type Tenant = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
};

export type SubscriptionStatus = {
  active: boolean;
  paidActive: boolean;
  trialActive: boolean;
  trialEndsAt: string;
  trialRemainingMs: number;
  status: string;
  plan: string;
};

export type Template = {
  id: string;
  name: string;
  description: string;
};

export type RunInput = {
  tenantId: string;
  templateId: string;
  modelProvider?: string;
  modelId?: string;
  byokApiKey?: string;
  prompt?: string;
};

export type PairingStatus = {
  paired: boolean;
  pairedAt: string | null;
  telegramUserId: string | null;
};

export type SignupStartResult = {
  ok: boolean;
  requiresVerification: boolean;
  devCode?: string;
};

export async function createTenant(input: TenantInput): Promise<Tenant> {
  const response = await fetch("/api/control/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Failed to create tenant");
  }

  return response.json() as Promise<Tenant>;
}

export async function startAccountSignup(input: TenantInput): Promise<SignupStartResult> {
  const response = await fetch("/api/control/accounts/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as {
    error?: string;
    ok?: boolean;
    requiresVerification?: boolean;
    devCode?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to start signup");
  }
  return {
    ok: payload.ok ?? false,
    requiresVerification: payload.requiresVerification ?? true,
    devCode: payload.devCode
  };
}

export async function verifyAccountSignup(input: {
  email: string;
  code: string;
}): Promise<{ tenantId: string }> {
  const response = await fetch("/api/control/accounts/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { error?: string; tenantId?: string };
  if (!response.ok || !payload.tenantId) {
    throw new Error(payload.error ?? "Failed to verify email");
  }
  return { tenantId: payload.tenantId };
}

export async function getTemplates(): Promise<Template[]> {
  const response = await fetch("/api/control/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }

  const payload = (await response.json()) as { templates: Template[] };
  return payload.templates;
}

export async function getTelegramPairingStatus(tenantId: string): Promise<PairingStatus> {
  const response = await fetch(`/api/control/telegram-pairing?tenantId=${tenantId}`);
  if (!response.ok) {
    throw new Error("Failed to load Telegram pairing status");
  }
  return response.json() as Promise<PairingStatus>;
}

export async function pairTelegram(input: {
  tenantId: string;
  pairingCode: string;
}): Promise<void> {
  const response = await fetch("/api/control/telegram-pairing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to pair Telegram");
  }
}

export async function saveTenantAgentConfig(input: {
  tenantId: string;
  modelProvider: string;
  modelId: string;
  byokApiKey: string;
}): Promise<void> {
  const response = await fetch("/api/control/tenant-agent-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to save agent config");
  }
}

export async function getSubscription(
  tenantId: string
): Promise<SubscriptionStatus> {
  const response = await fetch(`/api/control/subscriptions?tenantId=${tenantId}`);
  if (!response.ok) {
    throw new Error("Failed to check subscription");
  }
  return response.json() as Promise<SubscriptionStatus>;
}

export async function createRun(input: RunInput): Promise<{ runId: string; status: string }> {
  const response = await fetch("/api/control/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as { error?: string; runId?: string; status?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create run");
  }

  return { runId: payload.runId ?? "", status: payload.status ?? "unknown" };
}
