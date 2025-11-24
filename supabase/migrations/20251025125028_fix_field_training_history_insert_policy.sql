/*
  # Fix Field Training History Insert Policy
  
  1. Changes
    - Drop restrictive INSERT policy that only allows user_id = auth.uid()
    - Create new policy that allows authenticated users to insert history for any user
    - This enables admins to properly log actions when editing forms on behalf of others
  
  2. Security
    - Still requires authentication
    - Users with field_training_access can insert records
    - Admins and super_admins can insert records
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create history records" ON field_training_history;

-- Create new INSERT policy that allows admins to create history records
CREATE POLICY "Users with access can create history records"
  ON field_training_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_training_reports
      JOIN personnel ON personnel.project_id = field_training_reports.project_id
      WHERE field_training_reports.id = field_training_history.report_id
        AND personnel.user_id = auth.uid()
        AND personnel.field_training_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
  );
