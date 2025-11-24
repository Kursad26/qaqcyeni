/*
  # Add Organizer Access to Field Training Reports UPDATE Policy

  1. Problem
    - Current UPDATE policy only checks: creator, planner, admin, project_admin
    - Missing: organized_by_id (the organizer who will execute the training)
    - This prevents organizers from updating reports they didn't create

  2. Solution
    - Add organized_by_id check to UPDATE policy
    - Allow users to update reports where they are the organizer

  3. Security
    - Report creators can update ✓
    - Organizers (organized_by_id) can update ✓ NEW
    - Field training planners can update ✓
    - Admins and super_admins can update ✓
    - Project admins can update ✓
*/

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users with access can update reports" ON field_training_reports;

-- Create new UPDATE policy with organizer access
CREATE POLICY "Users with access can update reports"
  ON field_training_reports
  FOR UPDATE
  TO authenticated
  USING (
    -- Report creator can update
    created_by = auth.uid()
    OR
    -- Organizer can update (NEW - this fixes the issue!)
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = field_training_reports.organized_by_id
        AND personnel.user_id = auth.uid()
    )
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
      WHERE personnel.id = field_training_reports.organized_by_id
        AND personnel.user_id = auth.uid()
    )
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
