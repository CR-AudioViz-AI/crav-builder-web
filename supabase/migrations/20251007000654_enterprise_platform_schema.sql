/*
  # Enterprise Platform Schema

  ## Overview
  Complete production-grade platform with Discussion/Build modes, deterministic builds,
  RBAC, audit logging, workflow automation, marketplace, and observability.

  ## 1. Discussion vs Build Modes

  ### `ai_sessions`
  Separate discussion and build sessions
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `user_id` (uuid, references profiles)
  - `session_type` (text: 'discussion', 'build')
  - `messages` (jsonb, conversation history)
  - `pending_changes` (jsonb, uncommitted diffs for discussion mode)
  - `credits_consumed` (integer)
  - `created_at` (timestamptz)
  - `ended_at` (timestamptz, nullable)

  ### `change_requests`
  Approval workflow for AI changes
  - `id` (uuid, primary key)
  - `session_id` (uuid, references ai_sessions)
  - `project_id` (uuid, references projects)
  - `diff` (jsonb, file changes)
  - `summary` (text, AI-generated summary)
  - `status` (text: 'pending', 'approved', 'rejected', 'applied')
  - `approved_by` (uuid, references profiles, nullable)
  - `approved_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ## 2. Deterministic Builds

  ### `build_lockfiles`
  Dependency lockfiles for reproducible builds
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `version_number` (integer)
  - `lockfile_content` (jsonb)
  - `sbom` (jsonb, Software Bill of Materials)
  - `slsa_attestation` (jsonb, SLSA provenance)
  - `checksum` (text, SHA256)
  - `created_at` (timestamptz)

  ## 3. Export Configurations

  ### `export_configs`
  Export templates for repo, Docker, Terraform
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `export_type` (text: 'git_repo', 'docker', 'terraform', 'kubernetes')
  - `config` (jsonb, export settings)
  - `last_exported_at` (timestamptz)

  ## 4. Round-trip Editing

  ### `manual_edits`
  Track manual changes to preserve them
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `component_id` (uuid, references app_components)
  - `file_path` (text)
  - `edit_regions` (jsonb, protected regions)
  - `edited_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ## 5. Multi-agent Pipeline

  ### `pipeline_stages`
  Gated deployment pipeline
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `stage_name` (text: 'plan', 'code', 'test', 'review', 'deploy')
  - `agent_type` (text: 'architect', 'coder', 'tester', 'reviewer')
  - `status` (text: 'pending', 'running', 'passed', 'failed', 'blocked')
  - `output` (jsonb)
  - `gate_status` (text: 'open', 'closed')
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)

  ### `test_results`
  Test gate results
  - `id` (uuid, primary key)
  - `pipeline_stage_id` (uuid, references pipeline_stages)
  - `test_suite` (text)
  - `passed` (boolean)
  - `coverage_percent` (numeric)
  - `results` (jsonb)
  - `created_at` (timestamptz)

  ## 6. Prompt Governance

  ### `prompt_templates`
  Versioned prompt templates
  - `id` (uuid, primary key)
  - `name` (text)
  - `template` (text)
  - `version` (integer)
  - `variant` (text, for A/B testing)
  - `is_active` (boolean)
  - `performance_score` (numeric)
  - `created_at` (timestamptz)

  ### `prompt_evaluations`
  Track prompt performance
  - `id` (uuid, primary key)
  - `prompt_template_id` (uuid, references prompt_templates)
  - `input` (text)
  - `output` (text)
  - `eval_score` (numeric, 0-1)
  - `latency_ms` (integer)
  - `tokens_used` (integer)
  - `cost_usd` (numeric)
  - `created_at` (timestamptz)

  ## 7. Observability

  ### `llm_requests`
  Track all LLM API calls
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects, nullable)
  - `user_id` (uuid, references profiles)
  - `model` (text)
  - `prompt_tokens` (integer)
  - `completion_tokens` (integer)
  - `total_tokens` (integer)
  - `cost_usd` (numeric)
  - `latency_ms` (integer)
  - `status` (text: 'success', 'error', 'timeout')
  - `error_message` (text, nullable)
  - `created_at` (timestamptz)

  ### `cost_budgets`
  Budget tracking and alerts
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, nullable)
  - `organization_id` (uuid, references workspaces, nullable)
  - `budget_type` (text: 'daily', 'weekly', 'monthly')
  - `limit_usd` (numeric)
  - `current_spend_usd` (numeric)
  - `alert_threshold_percent` (integer)
  - `is_active` (boolean)
  - `period_start` (timestamptz)
  - `period_end` (timestamptz)

  ## 8. Security & Compliance

  ### `roles`
  RBAC roles
  - `id` (uuid, primary key)
  - `name` (text)
  - `permissions` (jsonb, array of permission strings)
  - `created_at` (timestamptz)

  ### `user_roles`
  User role assignments
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `role_id` (uuid, references roles)
  - `workspace_id` (uuid, references workspaces, nullable)
  - `project_id` (uuid, references projects, nullable)
  - `created_at` (timestamptz)

  ### `audit_logs`
  Complete audit trail
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `action` (text)
  - `resource_type` (text)
  - `resource_id` (uuid)
  - `changes` (jsonb)
  - `ip_address` (inet)
  - `user_agent` (text)
  - `created_at` (timestamptz)

  ### `sso_configs`
  SSO/SAML configuration
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `provider` (text: 'saml', 'oidc', 'oauth')
  - `config` (jsonb, encrypted)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ## 9. Workflow Automation

  ### `workflows`
  Automation workflows
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `name` (text)
  - `trigger_type` (text: 'schedule', 'webhook', 'event')
  - `trigger_config` (jsonb)
  - `steps` (jsonb, workflow definition)
  - `is_active` (boolean)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### `workflow_executions`
  Workflow run history
  - `id` (uuid, primary key)
  - `workflow_id` (uuid, references workflows)
  - `status` (text: 'running', 'completed', 'failed')
  - `trigger_data` (jsonb)
  - `execution_log` (jsonb)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)

  ## 10. Marketplace

  ### `blueprints`
  Reusable app templates
  - `id` (uuid, primary key)
  - `name` (text)
  - `description` (text)
  - `category` (text)
  - `author_id` (uuid, references profiles)
  - `code_template` (jsonb)
  - `config_schema` (jsonb)
  - `version` (text)
  - `price_cents` (integer)
  - `install_count` (integer)
  - `rating` (numeric)
  - `is_public` (boolean)
  - `created_at` (timestamptz)

  ### `blueprint_installs`
  Track blueprint installations
  - `id` (uuid, primary key)
  - `blueprint_id` (uuid, references blueprints)
  - `project_id` (uuid, references projects)
  - `user_id` (uuid, references profiles)
  - `version_installed` (text)
  - `config_values` (jsonb)
  - `status` (text: 'installed', 'active', 'rolled_back')
  - `installed_at` (timestamptz)
  - `rolled_back_at` (timestamptz, nullable)

  ## 11. Metered Billing

  ### `usage_events`
  Metered usage events for Stripe
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `event_type` (text: 'ai_generation', 'deployment', 'api_call', 'storage_gb_hour')
  - `quantity` (numeric)
  - `metadata` (jsonb)
  - `stripe_reported` (boolean)
  - `created_at` (timestamptz)

  ### `data_residency`
  Region and compliance controls
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `region` (text: 'us', 'eu', 'apac')
  - `compliance_frameworks` (jsonb, array: 'gdpr', 'hipaa', 'soc2')
  - `data_classification` (text: 'public', 'internal', 'confidential', 'restricted')
  - `encryption_key_id` (text)
  - `created_at` (timestamptz)

  ## Security
  All tables have RLS enabled with proper policies
*/

-- AI Sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('discussion', 'build')),
  messages jsonb DEFAULT '[]'::jsonb,
  pending_changes jsonb DEFAULT '{}'::jsonb,
  credits_consumed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Change Requests
CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  diff jsonb NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Build Lockfiles
CREATE TABLE IF NOT EXISTS build_lockfiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  lockfile_content jsonb NOT NULL,
  sbom jsonb NOT NULL,
  slsa_attestation jsonb NOT NULL,
  checksum text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Export Configs
CREATE TABLE IF NOT EXISTS export_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  export_type text NOT NULL CHECK (export_type IN ('git_repo', 'docker', 'terraform', 'kubernetes')),
  config jsonb DEFAULT '{}'::jsonb,
  last_exported_at timestamptz
);

-- Manual Edits
CREATE TABLE IF NOT EXISTS manual_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id uuid REFERENCES app_components(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  edit_regions jsonb NOT NULL,
  edited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_name text NOT NULL CHECK (stage_name IN ('plan', 'code', 'test', 'review', 'deploy')),
  agent_type text NOT NULL CHECK (agent_type IN ('architect', 'coder', 'tester', 'reviewer', 'deployer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'blocked')),
  output jsonb DEFAULT '{}'::jsonb,
  gate_status text NOT NULL DEFAULT 'closed' CHECK (gate_status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Test Results
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_stage_id uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  test_suite text NOT NULL,
  passed boolean NOT NULL,
  coverage_percent numeric,
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Prompt Templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  variant text,
  is_active boolean DEFAULT true,
  performance_score numeric,
  created_at timestamptz DEFAULT now()
);

-- Prompt Evaluations
CREATE TABLE IF NOT EXISTS prompt_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_template_id uuid NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  input text NOT NULL,
  output text NOT NULL,
  eval_score numeric CHECK (eval_score >= 0 AND eval_score <= 1),
  latency_ms integer NOT NULL,
  tokens_used integer NOT NULL,
  cost_usd numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- LLM Requests
CREATE TABLE IF NOT EXISTS llm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model text NOT NULL,
  prompt_tokens integer NOT NULL,
  completion_tokens integer NOT NULL,
  total_tokens integer NOT NULL,
  cost_usd numeric NOT NULL,
  latency_ms integer NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Cost Budgets
CREATE TABLE IF NOT EXISTS cost_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  organization_id uuid REFERENCES workspaces(id),
  budget_type text NOT NULL CHECK (budget_type IN ('daily', 'weekly', 'monthly')),
  limit_usd numeric NOT NULL,
  current_spend_usd numeric DEFAULT 0,
  alert_threshold_percent integer DEFAULT 80,
  is_active boolean DEFAULT true,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  CONSTRAINT budget_target CHECK (user_id IS NOT NULL OR organization_id IS NOT NULL)
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id),
  project_id uuid REFERENCES projects(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id, workspace_id, project_id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- SSO Configs
CREATE TABLE IF NOT EXISTS sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('saml', 'oidc', 'oauth')),
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Workflows
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('schedule', 'webhook', 'event')),
  trigger_config jsonb NOT NULL,
  steps jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  trigger_data jsonb,
  execution_log jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Blueprints
CREATE TABLE IF NOT EXISTS blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_template jsonb NOT NULL,
  config_schema jsonb NOT NULL,
  version text NOT NULL,
  price_cents integer DEFAULT 0,
  install_count integer DEFAULT 0,
  rating numeric,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Blueprint Installs
CREATE TABLE IF NOT EXISTS blueprint_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version_installed text NOT NULL,
  config_values jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'installed' CHECK (status IN ('installed', 'active', 'rolled_back')),
  installed_at timestamptz DEFAULT now(),
  rolled_back_at timestamptz
);

-- Usage Events
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('ai_generation', 'deployment', 'api_call', 'storage_gb_hour')),
  quantity numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  stripe_reported boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Data Residency
CREATE TABLE IF NOT EXISTS data_residency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  region text NOT NULL CHECK (region IN ('us', 'eu', 'apac')),
  compliance_frameworks jsonb DEFAULT '[]'::jsonb,
  data_classification text NOT NULL DEFAULT 'internal' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  encryption_key_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_lockfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency ENABLE ROW LEVEL SECURITY;

-- RLS Policies (User can access own data)
CREATE POLICY "Users can manage own sessions" ON ai_sessions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own change requests" ON change_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = change_requests.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can view own lockfiles" ON build_lockfiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = build_lockfiles.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can manage own exports" ON export_configs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = export_configs.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can manage own edits" ON manual_edits FOR ALL TO authenticated USING (edited_by = auth.uid() OR EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_edits.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can view own pipelines" ON pipeline_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_stages.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can view own test results" ON test_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM pipeline_stages ps JOIN projects p ON p.id = ps.project_id WHERE ps.id = test_results.pipeline_stage_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can view prompt templates" ON prompt_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own llm requests" ON llm_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own budgets" ON cost_budgets FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Workspace owners manage SSO" ON sso_configs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = sso_configs.workspace_id AND workspaces.owner_id = auth.uid()));
CREATE POLICY "Users can manage workspace workflows" ON workflows FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workflows.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.role IN ('owner', 'editor')));
CREATE POLICY "Users can view workflow executions" ON workflow_executions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM workflows w JOIN workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_executions.workflow_id AND wm.user_id = auth.uid()));
CREATE POLICY "Users can view public blueprints" ON blueprints FOR SELECT TO authenticated USING (is_public = true OR author_id = auth.uid());
CREATE POLICY "Users can manage own blueprint installs" ON blueprint_installs FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view own usage events" ON usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Workspace owners manage residency" ON data_residency FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = data_residency.workspace_id AND workspaces.owner_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_ai_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX idx_ai_sessions_project_id ON ai_sessions(project_id);
CREATE INDEX idx_change_requests_status ON change_requests(status);
CREATE INDEX idx_build_lockfiles_project_version ON build_lockfiles(project_id, version_number);
CREATE INDEX idx_pipeline_stages_project_status ON pipeline_stages(project_id, status);
CREATE INDEX idx_llm_requests_user_created ON llm_requests(user_id, created_at);
CREATE INDEX idx_llm_requests_cost ON llm_requests(cost_usd);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_workflow_executions_workflow_started ON workflow_executions(workflow_id, started_at);
CREATE INDEX idx_blueprints_category_rating ON blueprints(category, rating);
CREATE INDEX idx_usage_events_user_created ON usage_events(user_id, created_at);
CREATE INDEX idx_usage_events_stripe_reported ON usage_events(stripe_reported) WHERE stripe_reported = false;

-- Seed default roles
INSERT INTO roles (name, permissions) VALUES
  ('owner', '["project:*", "workspace:*", "billing:*", "settings:*"]'::jsonb),
  ('admin', '["project:*", "workspace:read", "workspace:write", "settings:read"]'::jsonb),
  ('developer', '["project:read", "project:write", "project:deploy"]'::jsonb),
  ('viewer', '["project:read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, created_at)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers on key tables
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_deployments AFTER INSERT OR UPDATE ON deployments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Function to track usage events
CREATE OR REPLACE FUNCTION track_usage_event(
  p_user_id uuid,
  p_event_type text,
  p_quantity numeric,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_events (user_id, event_type, quantity, metadata, created_at)
  VALUES (p_user_id, p_event_type, p_quantity, p_metadata, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;