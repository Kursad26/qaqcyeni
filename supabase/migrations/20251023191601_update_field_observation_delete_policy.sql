/*
  # Update Field Observation Delete Policy

  1. Problem
    - Only admins can delete reports
    - Approvers and creators should also be able to delete in pre-approval stage

  2. Solution
    - Update DELETE policy to allow:
      - Admins and super admins (always)
      - Report creators (always)
      - Approvers (always)

  3. Changes
    - Drop existing DELETE policy
    - Create new comprehensive DELETE policy
*/

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete reports" ON field_observation_reports;

-- Create new comprehensive DELETE policy
CREATE POLICY "Authorized users can delete reports"
  ON field_observation_reports
  FOR DELETE
  TO authenticated
  USING (
    -- Report creator can delete their own reports
    created_by = auth.uid()
    OR
    -- Admins and super admins can delete any report
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Approvers can delete reports in their project
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_approver = true
    )
  );
