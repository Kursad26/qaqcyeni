/*
  # Create Projects and Project Users Tables

  ## Description
  This migration creates tables for managing projects and their assigned users.
  Projects are managed by admins and can have multiple users assigned to them.

  ## Tables Created
  
  ### projects
  - `id` (uuid, primary key) - Unique project identifier
  - `name` (text, not null) - Project name
  - `description` (text) - Project description
  - `location` (text) - Project location
  - `admin_id` (uuid, not null) - References user_profiles(id) - Project admin
  - `is_active` (boolean, default true) - Whether project is active
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ### project_users
  - `id` (uuid, primary key) - Unique identifier
  - `project_id` (uuid, not null) - References projects(id)
  - `user_id` (uuid, not null) - References user_profiles(id)
  - `assigned_at` (timestamptz, default now()) - Assignment timestamp
  - Unique constraint on (project_id, user_id)

  ## Security
  - RLS enabled on both tables
  - Simple policies allowing authenticated users full access
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  admin_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_users junction table
CREATE TABLE IF NOT EXISTS project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Simple policies for projects
CREATE POLICY "projects_select_policy" 
  ON projects FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "projects_insert_policy" 
  ON projects FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "projects_update_policy" 
  ON projects FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "projects_delete_policy" 
  ON projects FOR DELETE 
  TO authenticated 
  USING (true);

-- Simple policies for project_users
CREATE POLICY "project_users_select_policy" 
  ON project_users FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "project_users_insert_policy" 
  ON project_users FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "project_users_update_policy" 
  ON project_users FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "project_users_delete_policy" 
  ON project_users FOR DELETE 
  TO authenticated 
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_admin_id ON projects(admin_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);

-- Create trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
