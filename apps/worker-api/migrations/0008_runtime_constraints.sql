CREATE TABLE IF NOT EXISTS tenant_openclaw_runtime_v2 (
  tenant_id TEXT PRIMARY KEY,
  workspace_prefix TEXT NOT NULL,
  sleep_after TEXT NOT NULL DEFAULT '10m'
    CHECK (sleep_after = 'never' OR sleep_after GLOB '[0-9]*[smhd]'),
  gateway_token TEXT NOT NULL
    CHECK (length(gateway_token) > 0),
  status TEXT NOT NULL DEFAULT 'bootstrapped'
    CHECK (status IN ('bootstrapping', 'bootstrapped', 'starting', 'running', 'failed')),
  bootstrapped_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

INSERT INTO tenant_openclaw_runtime_v2 (
  tenant_id,
  workspace_prefix,
  sleep_after,
  gateway_token,
  status,
  bootstrapped_at,
  created_at,
  updated_at
)
SELECT
  tenant_id,
  workspace_prefix,
  CASE
    WHEN sleep_after = 'never' OR sleep_after GLOB '[0-9]*[smhd]' THEN sleep_after
    ELSE '10m'
  END AS sleep_after,
  CASE
    WHEN gateway_token IS NOT NULL AND length(trim(gateway_token)) > 0 THEN gateway_token
    ELSE hex(randomblob(16))
  END AS gateway_token,
  CASE
    WHEN status IN ('bootstrapping', 'bootstrapped', 'starting', 'running', 'failed') THEN status
    ELSE 'bootstrapped'
  END AS status,
  bootstrapped_at,
  created_at,
  updated_at
FROM tenant_openclaw_runtime;

DROP TABLE tenant_openclaw_runtime;

ALTER TABLE tenant_openclaw_runtime_v2 RENAME TO tenant_openclaw_runtime;

CREATE INDEX IF NOT EXISTS idx_tenant_openclaw_runtime_status
  ON tenant_openclaw_runtime(status);
