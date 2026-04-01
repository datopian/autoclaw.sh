ALTER TABLE tenants ADD COLUMN model_provider TEXT;
ALTER TABLE tenants ADD COLUMN model_id TEXT;
ALTER TABLE tenants ADD COLUMN byok_api_key TEXT;

CREATE TABLE IF NOT EXISTS telegram_pairings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  pairing_code TEXT NOT NULL,
  status TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  paired_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_pairings_code ON telegram_pairings(pairing_code);
CREATE INDEX IF NOT EXISTS idx_telegram_pairings_tenant ON telegram_pairings(tenant_id);
