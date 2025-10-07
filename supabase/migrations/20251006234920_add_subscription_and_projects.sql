/*
  # Add Subscription Tiers and Project Tracking

  ## Overview
  Extends the base schema to support SaaS business model with subscription tiers,
  project tracking, usage limits, and customer ownership of generated code.

  ## 1. New Tables

  ### `subscription_plans`
  Available subscription tiers
  - `id` (uuid, primary key)
  - `name` (text: 'Free', 'Pro', 'Enterprise')
  - `price_monthly` (numeric, monthly price in cents)
  - `price_yearly` (numeric, yearly price in cents)
  - `max_projects` (integer, max number of projects)
  - `max_bases` (integer, max bases per project)
  - `max_records_per_base` (integer, max records)
  - `max_storage_mb` (integer, storage limit)
  - `features` (jsonb, feature flags)
  - `created_at` (timestamptz)

  ### `user_subscriptions`
  User's active subscription
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `plan_id` (uuid, references subscription_plans)
  - `status` (text: 'active', 'cancelled', 'past_due', 'trialing')
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `cancel_at_period_end` (boolean)
  - `stripe_customer_id` (text, nullable)
  - `stripe_subscription_id` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `projects`
  Customer projects (code they build and own)
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, owner)
  - `workspace_id` (uuid, references workspaces)
  - `name` (text, project name)
  - `description` (text)
  - `code_repository` (jsonb, stores generated code)
  - `deployment_url` (text, nullable)
  - `status` (text: 'active', 'archived', 'deployed')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `usage_metrics`
  Track usage for billing/limits
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `metric_type` (text: 'api_calls', 'storage', 'projects', 'bases', 'records')
  - `value` (integer, current value)
  - `period_start` (timestamptz)
  - `period_end` (timestamptz)
  - `created_at` (timestamptz)

  ### `project_versions`
  Version history of customer code
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `version_number` (integer)
  - `code_snapshot` (jsonb, full code at this version)
  - `changes_description` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ## 2. Security

  - All tables have RLS enabled
  - Users can only access their own subscription data
  - Users own their projects and code completely
  - Admin role can view aggregated metrics

  ## 3. Default Plans

  Seed data for Free, Pro, and Enterprise tiers
*/

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  max_projects integer NOT NULL DEFAULT 1,
  max_bases integer NOT NULL DEFAULT 5,
  max_records_per_base integer NOT NULL DEFAULT 1000,
  max_storage_mb integer NOT NULL DEFAULT 100,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT now() + interval '1 month',
  cancel_at_period_end boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Projects table (customer-owned code)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  code_repository jsonb DEFAULT '{}'::jsonb,
  deployment_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deployed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Usage metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('api_calls', 'storage', 'projects', 'bases', 'records')),
  value integer NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at timestamptz DEFAULT now()
);

-- Project versions table (code history)
CREATE TABLE IF NOT EXISTS project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  code_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  changes_description text DEFAULT '',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- Subscription plans policies (public read)
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- User subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Projects policies (users own their projects completely)
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Usage metrics policies
CREATE POLICY "Users can view own usage"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert usage metrics"
  ON usage_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Project versions policies
CREATE POLICY "Users can view own project versions"
  ON project_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_versions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create project versions"
  ON project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_versions.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, price_yearly, max_projects, max_bases, max_records_per_base, max_storage_mb, features)
VALUES 
  (
    'Free',
    0,
    0,
    1,
    3,
    1000,
    100,
    '{"api_access": true, "support": "community", "exports": true, "custom_domain": false, "priority_support": false, "white_label": false}'::jsonb
  ),
  (
    'Pro',
    2900,
    29000,
    10,
    20,
    50000,
    5000,
    '{"api_access": true, "support": "email", "exports": true, "custom_domain": true, "priority_support": true, "white_label": false, "advanced_analytics": true}'::jsonb
  ),
  (
    'Enterprise',
    9900,
    99000,
    -1,
    -1,
    -1,
    50000,
    '{"api_access": true, "support": "dedicated", "exports": true, "custom_domain": true, "priority_support": true, "white_label": true, "advanced_analytics": true, "sla": true, "custom_integrations": true}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- Function to auto-create free subscription on signup
CREATE OR REPLACE FUNCTION create_free_subscription_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (NEW.id, free_plan_id, 'active', now(), now() + interval '1 year');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create free subscription
CREATE TRIGGER on_profile_created_create_subscription
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_new_user();

-- Function to check if user is within subscription limits
CREATE OR REPLACE FUNCTION check_user_subscription_limit(
  p_user_id uuid,
  p_limit_type text
)
RETURNS boolean AS $$
DECLARE
  v_plan subscription_plans;
  v_current_count integer;
BEGIN
  SELECT sp.* INTO v_plan
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id AND us.status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF p_limit_type = 'projects' THEN
    SELECT COUNT(*) INTO v_current_count FROM projects WHERE user_id = p_user_id AND status != 'archived';
    RETURN v_plan.max_projects = -1 OR v_current_count < v_plan.max_projects;
  ELSIF p_limit_type = 'bases' THEN
    SELECT COUNT(*) INTO v_current_count 
    FROM bases b
    JOIN workspaces w ON w.id = b.workspace_id
    WHERE w.owner_id = p_user_id;
    RETURN v_plan.max_bases = -1 OR v_current_count < v_plan.max_bases;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;