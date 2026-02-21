CREATE TABLE IF NOT EXISTS tenant_openclaw_runtime (
  tenant_id TEXT PRIMARY KEY,
  workspace_prefix TEXT NOT NULL,
  sleep_after TEXT NOT NULL DEFAULT '10m',
  status TEXT NOT NULL DEFAULT 'bootstrapped',
  bootstrapped_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_openclaw_runtime_status
  ON tenant_openclaw_runtime(status);
