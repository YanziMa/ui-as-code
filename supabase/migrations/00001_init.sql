-- UI-as-Code Database Schema
-- Run this in Supabase SQL Editor or via CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== Users ==========
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== Frictions (Pain Points) ==========
CREATE TABLE frictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  saas_name TEXT NOT NULL,
  component_name TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_frictions_saas_name ON frictions(saas_name);
CREATE INDEX idx_frictions_component_name ON frictions(component_name);

-- ========== Diffs ==========
CREATE TABLE diffs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  friction_id UUID REFERENCES frictions(id),
  user_id UUID REFERENCES users(id),
  component_code TEXT NOT NULL,
  prompt TEXT NOT NULL,
  diff_result TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== Pull Requests ==========
CREATE TABLE pull_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  diff_id UUID REFERENCES diffs(id),
  user_id UUID REFERENCES users(id),
  description TEXT NOT NULL,
  affected_users INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'merged', 'closed')),
  votes_for INTEGER NOT NULL DEFAULT 0,
  votes_against INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pr_status ON pull_requests(status);
CREATE INDEX idx_pr_affected_users ON pull_requests(affected_users DESC);

-- ========== Row Level Security ==========
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE frictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Anyone can insert frictions (anonymous allowed for MVP)
CREATE POLICY "Anyone can insert frictions" ON frictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read frictions" ON frictions
  FOR SELECT USING (true);

-- Authenticated users can insert diffs
CREATE POLICY "Authenticated users can insert diffs" ON diffs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own diffs" ON diffs
  FOR SELECT USING (true);

-- Anyone can read open PRs
CREATE POLICY "Anyone can read PRs" ON pull_requests
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert PRs" ON pull_requests
  FOR INSERT WITH CHECK (true);
