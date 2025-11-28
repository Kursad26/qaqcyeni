/*
  # Field Training Settings RLS - Complete Fix

  ## Problem
  - Settings güncellenemiyor
  - RLS politikaları yeterince açık değil

  ## Çözüm
  - Tüm eski politikaları kaldır
  - Basit ve net yeni politikalar oluştur
  - Proje üyelerine kendi projelerini düzenleme yetkisi ver

  ## Güvenlik
  - RLS aktif kalacak
  - Sadece authenticated kullanıcılar erişebilir
  - Her kullanıcı sadece kendi projelerinin ayarlarını görebilir
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Project members can view field training settings" ON field_training_settings;
DROP POLICY IF EXISTS "Admins and project owners can manage field training settings" ON field_training_settings;

-- SELECT: Project members can view their project settings
CREATE POLICY "Allow project members to view training settings"
  ON field_training_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_training_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- INSERT: System admins and project members can create settings
CREATE POLICY "Allow project members to create training settings"
  ON field_training_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_training_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- UPDATE: Project members can update their project settings
CREATE POLICY "Allow project members to update training settings"
  ON field_training_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_training_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_training_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- DELETE: Only system admins can delete settings
CREATE POLICY "Allow admins to delete training settings"
  ON field_training_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );
