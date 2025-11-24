/*
  # Fix Field Observation Settings Update Policy

  ## Changes
  
  ### Security
  - Add policy to allow users with field_observation_creator permission to UPDATE current_number in field_observation_settings
  - This is required when creating new reports as the system needs to increment the report number counter
  
  ## Important Notes
  - Users can only UPDATE the settings, not create or delete them
  - The existing admin policy remains for full management
  - This ensures report number generation works correctly for all authorized users
*/

-- Drop the existing "FOR ALL" policy for admins and recreate with separate policies
DROP POLICY IF EXISTS "Admins can manage field observation settings" ON field_observation_settings;

-- Admins can INSERT new settings
CREATE POLICY "Admins can insert field observation settings"
  ON field_observation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can UPDATE settings
CREATE POLICY "Admins can update field observation settings"
  ON field_observation_settings
  FOR UPDATE
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

-- Admins can DELETE settings
CREATE POLICY "Admins can delete field observation settings"
  ON field_observation_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users with creator permission can UPDATE current_number (for report number generation)
CREATE POLICY "Creators can update field observation settings counter"
  ON field_observation_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_settings.project_id
      AND personnel.field_observation_creator = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_settings.project_id
      AND personnel.field_observation_creator = true
    )
  );