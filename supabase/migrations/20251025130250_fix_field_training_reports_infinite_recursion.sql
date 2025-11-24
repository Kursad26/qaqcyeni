/*
  # Fix Infinite Recursion in Field Training Reports RLS

  1. Problem
    - UPDATE policy has infinite recursion: queries field_training_reports while checking field_training_reports
    - This causes "infinite recursion detected in policy" error

  2. Solution
    - Simplify UPDATE policy to avoid self-referencing query
    - Use direct checks without subqueries on same table
    - Keep security intact while removing recursion

  3. Security
    - Report creators can update their reports
    - Personnel with field_training_planner role can update
    - Admins and super_admins can update
    - Project admins can update
*/

-- Drop existing problematic UPDATE policy
DROP POLICY IF EXISTS "Report creators, organizers, planners and admins can update rep" ON field_training_reports;

-- Create new UPDATE policy without infinite recursion
CREATE POLICY "Users with access can update reports"
  ON field_training_reports
  FOR UPDATE
  TO authenticated
  USING (
    -- Report creator can update
    created_by = auth.uid()
    OR
    -- Field training planners can update
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
        AND personnel.project_id = field_training_reports.project_id
        AND personnel.field_training_planner = true
    )
    OR
    -- Admins can update
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Project admin can update
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_training_reports.project_id
        AND projects.admin_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
        AND personnel.project_id = field_training_reports.project_id
        AND personnel.field_training_planner = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_training_reports.project_id
        AND projects.admin_id = auth.uid()
    )
  );
