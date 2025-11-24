/*
  # Field Observation Settings RLS - Complete Reset

  ## Problem
  - Hiçbir kullanıcı (super admin dahil) settings güncelleyemiyor
  - Mevcut politikalar çakışıyor olabilir
  
  ## Çözüm
  - Tüm eski politikaları kaldır
  - Basit ve net yeni politikalar oluştur
  - Super admin'lere her şey için yetki ver
  - Proje üyelerine sadece kendi projelerini düzenletme yetkisi ver
  
  ## Güvenlik
  - RLS aktif kalacak
  - Sadece authenticated kullanıcılar erişebilir
  - Her kullanıcı sadece kendi projelerinin ayarlarını görebilir
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Project members can view field observation settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Admins can insert field observation settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Project admins can insert field observation settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Admins can update field observation settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Project admins can update field observation settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Project members can update field observation settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Creators can update field observation settings counter" ON field_observation_settings;
DROP POLICY IF EXISTS "Admins can delete field observation settings" ON field_observation_settings;

-- SELECT: Project members can view their project settings
CREATE POLICY "Allow project members to view settings"
  ON field_observation_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- INSERT: System admins and project members can create settings
CREATE POLICY "Allow project members to create settings"
  ON field_observation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- System admins can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Project members can insert for their projects
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- UPDATE: Project members can update their project settings
CREATE POLICY "Allow project members to update settings"
  ON field_observation_settings
  FOR UPDATE
  TO authenticated
  USING (
    -- System admins can update anything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Project members can update their project settings
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for WITH CHECK
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- DELETE: Only system admins can delete settings
CREATE POLICY "Allow admins to delete settings"
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