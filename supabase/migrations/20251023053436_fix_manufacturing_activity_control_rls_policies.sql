/*
  # RLS Politikalarını Güncelle - İmalat, Aktivite ve Kontrol Adımları

  ## Değişiklikler
  1. Mevcut kısıtlayıcı RLS politikalarını kaldır
  2. Proje sahibi ve super_admin kullanıcılarını da içeren yeni politikalar ekle
  
  ## Güvenlik
  - Proje sahibi (admin_id) tam erişime sahip
  - Super admin kullanıcıları tam erişime sahip
  - Proje üyeleri (project_users) tam erişime sahip
*/

-- İmalat Birimleri için politikaları güncelle
DROP POLICY IF EXISTS "Project members can view manufacturing units" ON project_manufacturing_units;
DROP POLICY IF EXISTS "Project members can insert manufacturing units" ON project_manufacturing_units;
DROP POLICY IF EXISTS "Project members can update manufacturing units" ON project_manufacturing_units;
DROP POLICY IF EXISTS "Project members can delete manufacturing units" ON project_manufacturing_units;

CREATE POLICY "Users can view manufacturing units"
  ON project_manufacturing_units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_manufacturing_units.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert manufacturing units"
  ON project_manufacturing_units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_manufacturing_units.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update manufacturing units"
  ON project_manufacturing_units FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_manufacturing_units.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_manufacturing_units.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete manufacturing units"
  ON project_manufacturing_units FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_manufacturing_units.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- Aktiviteler için politikaları güncelle
DROP POLICY IF EXISTS "Project members can view activities" ON project_activities;
DROP POLICY IF EXISTS "Project members can insert activities" ON project_activities;
DROP POLICY IF EXISTS "Project members can update activities" ON project_activities;
DROP POLICY IF EXISTS "Project members can delete activities" ON project_activities;

CREATE POLICY "Users can view activities"
  ON project_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_activities.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activities"
  ON project_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_activities.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update activities"
  ON project_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_activities.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_activities.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete activities"
  ON project_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_activities.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- Kontrol Adımları için politikaları güncelle
DROP POLICY IF EXISTS "Project members can view control steps" ON project_control_steps;
DROP POLICY IF EXISTS "Project members can insert control steps" ON project_control_steps;
DROP POLICY IF EXISTS "Project members can update control steps" ON project_control_steps;
DROP POLICY IF EXISTS "Project members can delete control steps" ON project_control_steps;

CREATE POLICY "Users can view control steps"
  ON project_control_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_control_steps.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert control steps"
  ON project_control_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_control_steps.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update control steps"
  ON project_control_steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_control_steps.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_control_steps.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete control steps"
  ON project_control_steps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_control_steps.project_id
      AND projects.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );