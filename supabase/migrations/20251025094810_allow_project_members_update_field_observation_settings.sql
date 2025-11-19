/*
  # Field Observation Settings - Extend Update Permissions

  ## Değişiklikler
  
  ### Security
  - Proje üyelerine field observation settings güncelleme yetkisi ver
  - Herhangi bir proje üyesi (project_users tablosunda olan) settings'i güncelleyebilir
  - Bu sayede proje admini olmasa bile, proje yöneticileri ayarları değiştirebilir
  
  ## Önemli Notlar
  - Sadece UPDATE yetkisi veriliyor
  - INSERT yetkisi hala sadece admin'lerde
  - Proje üyeleri sadece kendi projelerinin ayarlarını değiştirebilir
*/

-- Drop the restrictive project admin policy
DROP POLICY IF EXISTS "Project admins can update field observation settings" ON field_observation_settings;

-- Create a more permissive policy for all project members
CREATE POLICY "Project members can update field observation settings"
  ON field_observation_settings
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if user is a member of the project
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
    -- OR check if user is system admin/super admin
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    -- OR check if user is the project admin
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same checks for WITH CHECK
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
  );