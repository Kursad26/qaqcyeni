/*
  # Fix Infinite Recursion in Field Observation RLS Policies

  1. Problem
    - UPDATE policy has infinite recursion by querying field_observation_reports within field_observation_reports policy
    - This causes "infinite recursion detected" errors

  2. Solution
    - Simplify UPDATE policy to avoid self-referencing queries
    - Remove the subquery that causes recursion
    - Use simpler conditions for checking permissions

  3. Changes
    - Drop existing UPDATE policy
    - Create new simplified UPDATE policy without recursion
*/

-- Drop existing problematic UPDATE policy
DROP POLICY IF EXISTS "Report creators, responsible personnel, approvers and admins ca" ON field_observation_reports;

-- Create simplified UPDATE policy without recursion
CREATE POLICY "Users can update reports they have access to"
  ON field_observation_reports
  FOR UPDATE
  TO authenticated
  USING (
    -- Report creator
    created_by = auth.uid()
    OR
    -- Admins and super admins
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Approvers in the project
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_approver = true
    )
    OR
    -- Responsible personnel (check directly without subquery)
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND (
        personnel.id = field_observation_reports.responsible_person_1_id
        OR personnel.id = field_observation_reports.responsible_person_2_id
      )
    )
  )
  WITH CHECK (
    -- Report creator
    created_by = auth.uid()
    OR
    -- Admins and super admins
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Approvers in the project
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_approver = true
    )
    OR
    -- Responsible personnel
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND (
        personnel.id = field_observation_reports.responsible_person_1_id
        OR personnel.id = field_observation_reports.responsible_person_2_id
      )
    )
  );
