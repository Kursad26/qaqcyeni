/*
  # Add Project Floors Table

  ## Description
  Creates a table for managing project floors (katlar) to complete the building structure
  hierarchy: Building > Block > Floor

  ## New Tables

  ### project_floors
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `building_id` (uuid, foreign key to project_buildings, nullable)
  - `block_id` (uuid, foreign key to project_blocks, nullable)
  - `name` (text) - Floor name (Zemin Kat, 1. Kat, etc.)
  - `floor_number` (integer) - For ordering
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS
  - Admin-only policies
*/

CREATE TABLE IF NOT EXISTS project_floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  building_id uuid REFERENCES project_buildings(id) ON DELETE SET NULL,
  block_id uuid REFERENCES project_blocks(id) ON DELETE SET NULL,
  name text NOT NULL,
  floor_number integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project floors"
  ON project_floors
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

CREATE INDEX IF NOT EXISTS idx_project_floors_project_id ON project_floors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_floors_building_id ON project_floors(building_id);
CREATE INDEX IF NOT EXISTS idx_project_floors_block_id ON project_floors(block_id);
