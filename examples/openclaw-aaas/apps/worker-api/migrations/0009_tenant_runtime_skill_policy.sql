CREATE TABLE IF NOT EXISTS tenant_runtime_skill_policy (
  tenant_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 1 CHECK (allowed IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, skill_name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_runtime_skill_policy_tenant
  ON tenant_runtime_skill_policy(tenant_id);
