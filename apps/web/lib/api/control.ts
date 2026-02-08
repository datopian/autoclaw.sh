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

export async function getTemplates(): Promise<Template[]> {
  const response = await fetch("/api/control/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }

  const payload = (await response.json()) as { templates: Template[] };
  return payload.templates;
}

export async function getSubscription(
  tenantId: string
): Promise<{ active: boolean; status: string; plan: string }> {
  const response = await fetch(`/api/control/subscriptions?tenantId=${tenantId}`);
  if (!response.ok) {
    throw new Error("Failed to check subscription");
  }
  return response.json() as Promise<{ active: boolean; status: string; plan: string }>;
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
