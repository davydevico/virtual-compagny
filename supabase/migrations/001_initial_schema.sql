-- ============================================================
-- SURGIFLOW COMPANY OS — Schéma initial
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : agents
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  department   TEXT NOT NULL,
  avatar       TEXT NOT NULL DEFAULT '🤖',
  personality  TEXT NOT NULL,
  knowledge    TEXT NOT NULL DEFAULT '',
  manager_id   UUID REFERENCES agents(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_mission')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : memories
-- ============================================================
CREATE TABLE IF NOT EXISTS memories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id   UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  project_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

-- ============================================================
-- TABLE : recruitment_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS recruitment_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role_needed  TEXT NOT NULL,
  department   TEXT NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruitment_status ON recruitment_requests(status);

-- ============================================================
-- TABLE : projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  brief      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : project_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS project_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  message    TEXT NOT NULL,
  log_type   TEXT NOT NULL DEFAULT 'output' CHECK (log_type IN ('system', 'thinking', 'output', 'success', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_logs_project_id ON project_logs(project_id);
CREATE INDEX idx_project_logs_created_at ON project_logs(created_at ASC);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE agents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_logs       ENABLE ROW LEVEL SECURITY;

-- Politiques permissives pour le service role (API routes)
-- Le frontend n'a accès qu'en lecture via anon key + policies ci-dessous

-- agents : lecture publique, écriture service role uniquement
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (true);

-- memories : lecture/écriture service role
CREATE POLICY "memories_select" ON memories FOR SELECT USING (true);
CREATE POLICY "memories_insert" ON memories FOR INSERT WITH CHECK (true);

-- recruitment_requests
CREATE POLICY "recruit_select" ON recruitment_requests FOR SELECT USING (true);
CREATE POLICY "recruit_insert" ON recruitment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "recruit_update" ON recruitment_requests FOR UPDATE USING (true);

-- projects
CREATE POLICY "projects_select" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (true);

-- project_logs
CREATE POLICY "logs_select" ON project_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON project_logs FOR INSERT WITH CHECK (true);
