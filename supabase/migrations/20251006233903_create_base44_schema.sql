/*
  # Base44 Database Schema

  ## Overview
  This migration creates the complete database structure for a Base44-like application
  with workspaces, bases, tables, fields, records, and collaboration features.

  ## 1. New Tables

  ### `profiles`
  User profile information linked to auth.users
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, not null)
  - `full_name` (text)
  - `avatar_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `workspaces`
  Top-level organization containers
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `owner_id` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `workspace_members`
  Junction table for workspace access control
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `user_id` (uuid, references profiles)
  - `role` (text: 'owner', 'editor', 'viewer')
  - `created_at` (timestamptz)

  ### `bases`
  Database containers within workspaces
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `name` (text, not null)
  - `description` (text)
  - `icon` (text)
  - `color` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `tables`
  Tables within bases
  - `id` (uuid, primary key)
  - `base_id` (uuid, references bases)
  - `name` (text, not null)
  - `description` (text)
  - `order_index` (integer, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `fields`
  Field definitions for tables
  - `id` (uuid, primary key)
  - `table_id` (uuid, references tables)
  - `name` (text, not null)
  - `type` (text: 'text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url', 'email', 'phone')
  - `options` (jsonb for select/multiselect choices)
  - `order_index` (integer, default 0)
  - `required` (boolean, default false)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `records`
  Data records in tables
  - `id` (uuid, primary key)
  - `table_id` (uuid, references tables)
  - `data` (jsonb, stores field values)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `collaborators`
  Real-time presence tracking
  - `id` (uuid, primary key)
  - `base_id` (uuid, references bases)
  - `user_id` (uuid, references profiles)
  - `last_seen` (timestamptz)
  - `cursor_position` (jsonb)

  ## 2. Security

  All tables have RLS enabled with policies for:
  - Authenticated users can read their own data
  - Workspace members can access workspace resources
  - Proper ownership and membership checks

  ## 3. Indexes

  Indexes added for:
  - Foreign key relationships
  - Common query patterns
  - Performance optimization
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspace members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Bases table
CREATE TABLE IF NOT EXISTS bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '📊',
  color text DEFAULT '#3b82f6',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fields table
CREATE TABLE IF NOT EXISTS fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url', 'email', 'phone')),
  options jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0,
  required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Records table
CREATE TABLE IF NOT EXISTS records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  data jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collaborators table (for real-time presence)
CREATE TABLE IF NOT EXISTS collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen timestamptz DEFAULT now(),
  cursor_position jsonb,
  UNIQUE(base_id, user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Workspace members can view workspace"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can update workspace"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete workspace"
  ON workspaces FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Workspace members can view membership"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON workspace_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Bases policies
CREATE POLICY "Workspace members can view bases"
  ON bases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = bases.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace editors can create bases"
  ON bases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = bases.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Workspace editors can update bases"
  ON bases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = bases.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = bases.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Workspace owners can delete bases"
  ON bases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = bases.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Tables policies
CREATE POLICY "Base viewers can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bases
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE bases.id = tables.base_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Base editors can manage tables"
  ON tables FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bases
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE bases.id = tables.base_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
    )
  );

-- Fields policies
CREATE POLICY "Table viewers can view fields"
  ON fields FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables
      JOIN bases ON bases.id = tables.base_id
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE tables.id = fields.table_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Table editors can manage fields"
  ON fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables
      JOIN bases ON bases.id = tables.base_id
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE tables.id = fields.table_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
    )
  );

-- Records policies
CREATE POLICY "Table viewers can view records"
  ON records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables
      JOIN bases ON bases.id = tables.base_id
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE tables.id = records.table_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Table editors can manage records"
  ON records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables
      JOIN bases ON bases.id = tables.base_id
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE tables.id = records.table_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'editor')
    )
  );

-- Collaborators policies
CREATE POLICY "Base members can view collaborators"
  ON collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bases
      JOIN workspace_members ON workspace_members.workspace_id = bases.workspace_id
      WHERE bases.id = collaborators.base_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own presence"
  ON collaborators FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bases_workspace_id ON bases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tables_base_id ON tables(base_id);
CREATE INDEX IF NOT EXISTS idx_fields_table_id ON fields(table_id);
CREATE INDEX IF NOT EXISTS idx_records_table_id ON records(table_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_base_id ON collaborators(base_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bases_updated_at BEFORE UPDATE ON bases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();