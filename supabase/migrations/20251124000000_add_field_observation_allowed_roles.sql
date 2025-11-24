-- Create table for field observation allowed roles
-- This table stores which roles are allowed to be assigned as responsible persons
-- in field observation reports

CREATE TABLE IF NOT EXISTS field_observation_allowed_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, role_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_field_observation_allowed_roles_project_id
  ON field_observation_allowed_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_field_observation_allowed_roles_role_id
  ON field_observation_allowed_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_field_observation_allowed_roles_active
  ON field_observation_allowed_roles(project_id, is_active);

-- Add RLS policies
ALTER TABLE field_observation_allowed_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read based on project access
CREATE POLICY "Users can view allowed roles for their projects"
  ON field_observation_allowed_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_allowed_roles.project_id
        AND project_users.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_allowed_roles.project_id
        AND projects.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin')
    )
  );

-- Allow project admins and super admins to insert
CREATE POLICY "Project admins can add allowed roles"
  ON field_observation_allowed_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_allowed_roles.project_id
        AND projects.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin')
    )
  );

-- Allow project admins and super admins to update
CREATE POLICY "Project admins can update allowed roles"
  ON field_observation_allowed_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_allowed_roles.project_id
        AND projects.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin')
    )
  );

-- Allow project admins and super admins to delete
CREATE POLICY "Project admins can delete allowed roles"
  ON field_observation_allowed_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_allowed_roles.project_id
        AND projects.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin')
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_field_observation_allowed_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_field_observation_allowed_roles_updated_at
  BEFORE UPDATE ON field_observation_allowed_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_field_observation_allowed_roles_updated_at();
