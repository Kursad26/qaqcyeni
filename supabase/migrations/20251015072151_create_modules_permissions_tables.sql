/*
  # Create Modules and Module Permissions Tables

  ## Description
  This migration creates tables for managing system modules and their permissions.
  Modules define different features/sections of the application, and permissions
  control which users can access which modules within projects.

  ## Tables Created
  
  ### modules
  - `id` (uuid, primary key) - Unique module identifier
  - `name` (text, not null, unique) - Module name
  - `description` (text) - Module description
  - `is_active` (boolean, default true) - Whether module is active
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ### module_permissions
  - `id` (uuid, primary key) - Unique identifier
  - `project_id` (uuid, not null) - References projects(id)
  - `user_id` (uuid, not null) - References user_profiles(id)
  - `module_id` (uuid, not null) - References modules(id)
  - `can_view` (boolean, default false) - View permission
  - `can_edit` (boolean, default false) - Edit permission
  - `can_delete` (boolean, default false) - Delete permission
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp
  - Unique constraint on (project_id, user_id, module_id)

  ## Security
  - RLS enabled on both tables
  - Simple policies allowing authenticated users full access
*/

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create module_permissions table
CREATE TABLE IF NOT EXISTS module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, module_id)
);

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;

-- Simple policies for modules
CREATE POLICY "modules_select_policy" 
  ON modules FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "modules_insert_policy" 
  ON modules FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "modules_update_policy" 
  ON modules FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "modules_delete_policy" 
  ON modules FOR DELETE 
  TO authenticated 
  USING (true);

-- Simple policies for module_permissions
CREATE POLICY "module_permissions_select_policy" 
  ON module_permissions FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "module_permissions_insert_policy" 
  ON module_permissions FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "module_permissions_update_policy" 
  ON module_permissions FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "module_permissions_delete_policy" 
  ON module_permissions FOR DELETE 
  TO authenticated 
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON modules(is_active);
CREATE INDEX IF NOT EXISTS idx_module_permissions_project_id ON module_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_user_id ON module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module_id ON module_permissions(module_id);

-- Create triggers for updated_at
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_permissions_updated_at
  BEFORE UPDATE ON module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
