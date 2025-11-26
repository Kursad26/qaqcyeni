/*
  # Fix RLS Policies for Project Buildings, Blocks, and Floors

  ## Problem
  Current RLS policies only allow admins to view building, block, and floor data.
  Regular users with field observation access cannot see these dropdowns.

  ## Solution
  Add SELECT policies that allow all project members to view this data.
  Keep the management (INSERT, UPDATE, DELETE) restricted to admins only.

  ## Changes
  1. Add SELECT policies for project members on:
     - project_buildings
     - project_blocks  
     - project_floors
  2. Keep existing admin-only management policies
*/

-- Add SELECT policies for project members to view buildings
CREATE POLICY "Project members can view project buildings"
  ON project_buildings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_buildings.project_id
      AND project_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Add SELECT policies for project members to view blocks
CREATE POLICY "Project members can view project blocks"
  ON project_blocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_blocks.project_id
      AND project_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Add SELECT policies for project members to view floors
CREATE POLICY "Project members can view project floors"
  ON project_floors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_floors.project_id
      AND project_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );
