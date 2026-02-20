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

export type TenantProfile = {
  id: string;
  name: string;
  email: string;
  status: string;
  modelProvider: string | null;
  modelId: string | null;
  hasApiKey: boolean;
};

export type AgentSkill = {
  id: string;
  workspaceId: string;
  name: string;
  kind: string;
  enabled: boolean;
  content: string;
  updatedAt: string;
};

export type AuthStartResult = {
  ok: boolean;
  requiresVerification: boolean;
  devCode?: string;
};

export type AuthUser = {
  accountId: string;
  tenantId: string;
  email: string;
  name: string;
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

export async function startAuth(input: {
  email: string;
  name?: string;
}): Promise<AuthStartResult> {
  const response = await fetch("/api/auth/start", {
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
    throw new Error(payload.error ?? "Failed to start authentication");
  }
  return {
    ok: payload.ok ?? false,
    requiresVerification: payload.requiresVerification ?? true,
    devCode: payload.devCode
  };
}

export async function verifyAuth(input: {
  email: string;
  code: string;
}): Promise<{ user: AuthUser }> {
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { error?: string; user?: AuthUser };
  if (!response.ok || !payload.user) {
    throw new Error(payload.error ?? "Failed to verify login code");
  }
  return { user: payload.user };
}

export async function getAuthMe(): Promise<{ user: AuthUser }> {
  const response = await fetch("/api/auth/me");
  const payload = (await response.json()) as {
    error?: string;
    authenticated?: boolean;
    user?: AuthUser;
  };
  if (!response.ok || !payload.authenticated || !payload.user) {
    throw new Error(payload.error ?? "Not authenticated");
  }
  return { user: payload.user };
}

export async function logoutAuth(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST"
  });
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

export async function getTenantProfile(): Promise<TenantProfile | null> {
  const response = await fetch("/api/control/tenants");
  const payload = (await response.json()) as { error?: string; tenant?: TenantProfile | null };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load tenant profile");
  }
  return payload.tenant ?? null;
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

export async function getSkills(): Promise<AgentSkill[]> {
  const response = await fetch("/api/control/skills");
  const payload = (await response.json()) as { error?: string; skills?: AgentSkill[] };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load skills");
  }
  return payload.skills ?? [];
}

export async function createSkill(input: {
  name: string;
  kind?: string;
  content: string;
  enabled?: boolean;
}): Promise<AgentSkill> {
  const response = await fetch("/api/control/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { error?: string; skill?: AgentSkill };
  if (!response.ok || !payload.skill) {
    throw new Error(payload.error ?? "Failed to create skill");
  }
  return payload.skill;
}

export async function updateSkill(input: {
  skillId: string;
  name?: string;
  kind?: string;
  content?: string;
  enabled?: boolean;
}): Promise<AgentSkill> {
  const response = await fetch("/api/control/skills", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { error?: string; skill?: AgentSkill };
  if (!response.ok || !payload.skill) {
    throw new Error(payload.error ?? "Failed to update skill");
  }
  return payload.skill;
}

export async function deleteSkill(skillId: string): Promise<void> {
  const response = await fetch("/api/control/skills", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillId })
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to delete skill");
  }
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
