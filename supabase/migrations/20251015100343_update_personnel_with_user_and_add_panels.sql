/*
  # Update Personnel Table and Add Panels Management

  ## Changes to Existing Tables
  
  ### personnel table
  - Add `user_id` column to link personnel with users
  - Keep existing fields for flexibility
  
  ## New Tables

  ### project_panels
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `name` (text) - Panel name (Dashboard, Reports, Settings, etc.)
  - `slug` (text) - URL slug for the panel
  - `is_active` (boolean) - Whether panel is accessible
  - `created_at` (timestamptz)

  ### user_panel_access
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to user_profiles)
  - `project_id` (uuid, foreign key to projects)
  - `panel_id` (uuid, foreign key to project_panels)
  - `is_active` (boolean) - Whether user has access to this panel
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Admin-only policies for management
*/

-- Add user_id to personnel if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE personnel ADD COLUMN user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create project_panels table
CREATE TABLE IF NOT EXISTS project_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, slug)
);

ALTER TABLE project_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project panels"
  ON project_panels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create user_panel_access table
CREATE TABLE IF NOT EXISTS user_panel_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  panel_id uuid REFERENCES project_panels(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, project_id, panel_id)
);

ALTER TABLE user_panel_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user panel access"
  ON user_panel_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view their own panel access"
  ON user_panel_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_personnel_user_id ON personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_project_panels_project_id ON project_panels(project_id);
CREATE INDEX IF NOT EXISTS idx_user_panel_access_user_id ON user_panel_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_panel_access_project_id ON user_panel_access(project_id);
