CREATE TABLE IF NOT EXISTS agent_workspaces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  memory_mode TEXT NOT NULL DEFAULT 'vector',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_workspaces_tenant_id ON agent_workspaces(tenant_id);

CREATE TABLE IF NOT EXISTS agent_prompts (
  workspace_id TEXT PRIMARY KEY,
  system_prompt_r2_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agent_workspaces(id)
);

CREATE TABLE IF NOT EXISTS agent_skills (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agent_workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_workspace_id ON agent_skills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_enabled ON agent_skills(enabled);

CREATE TABLE IF NOT EXISTS memory_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_id TEXT,
  role TEXT NOT NULL,
  content_r2_key TEXT NOT NULL,
  seq INTEGER NOT NULL,
  redaction_version TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_memory_events_tenant_seq ON memory_events(tenant_id, seq);
CREATE INDEX IF NOT EXISTS idx_memory_events_tenant_created_at ON memory_events(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  token_count INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (event_id) REFERENCES memory_events(id)
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_tenant_created_at ON memory_chunks(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_event_id ON memory_chunks(event_id);

CREATE TABLE IF NOT EXISTS memory_vectors (
  chunk_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (chunk_id) REFERENCES memory_chunks(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_vectors_vector_id ON memory_vectors(vector_id);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_tenant_status ON memory_vectors(tenant_id, status);

CREATE TABLE IF NOT EXISTS memory_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  confidence REAL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_profiles_tenant_fact_key ON memory_profiles(tenant_id, fact_key);

CREATE TABLE IF NOT EXISTS memory_distillations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  quality_score REAL,
  seq_from INTEGER,
  seq_to INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_memory_distillations_tenant_created_at ON memory_distillations(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memory_distillations_tenant_scope ON memory_distillations(tenant_id, scope);

CREATE TABLE IF NOT EXISTS memory_seq_watermarks (
  tenant_id TEXT PRIMARY KEY,
  last_ingested_seq INTEGER NOT NULL DEFAULT 0,
  last_distilled_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
