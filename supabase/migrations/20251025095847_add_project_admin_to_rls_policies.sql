/*
  # Add Project Admin Check to RLS Policies

  ## Problem
  - Proje admin'leri project_users tablosunda olmayabiliyor
  - Bu yüzden kendi projelerinin ayarlarını değiştiremiyor
  
  ## Çözüm
  - Tüm politikalara projects.admin_id kontrolü ekle
  - Proje admin'i her zaman kendi projesine erişebilsin
  
  ## Güvenlik
  - RLS aktif kalıyor
  - Sadece proje admin'i veya proje üyesi olanlar erişebilir
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow project members to view settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Allow project members to create settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Allow project members to update settings" ON field_observation_settings;
DROP POLICY IF EXISTS "Allow admins to delete settings" ON field_observation_settings;

-- SELECT: Project admin or project members can view
CREATE POLICY "Allow project access to view settings"
  ON field_observation_settings
  FOR SELECT
  TO authenticated
  USING (
    -- Project admin can view
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    -- Project members can view
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- INSERT: System admins, project admin, or project members can create
CREATE POLICY "Allow project access to create settings"
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
    -- Project admin can insert
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    -- Project members can insert
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- UPDATE: System admins, project admin, or project members can update
CREATE POLICY "Allow project access to update settings"
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
    -- Project admin can update
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    -- Project members can update
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same checks for WITH CHECK
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = field_observation_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- DELETE: Only system admins or project admin can delete
CREATE POLICY "Allow admins to delete settings"
  ON field_observation_settings
  FOR DELETE
  TO authenticated
  USING (
    -- System admins can delete
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    -- Project admin can delete
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
  );