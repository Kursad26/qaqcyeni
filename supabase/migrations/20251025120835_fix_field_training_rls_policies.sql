-- Drop existing policies if any
DROP POLICY IF EXISTS "Project members can view field training settings" ON field_training_settings;
DROP POLICY IF EXISTS "Project members can manage field training settings" ON field_training_settings;
DROP POLICY IF EXISTS "Users with field training access can view reports" ON field_training_reports;
DROP POLICY IF EXISTS "Users with field training access can create reports" ON field_training_reports;
DROP POLICY IF EXISTS "Report creators, organizers, planners and admins can update reports" ON field_training_reports;
DROP POLICY IF EXISTS "Admins and project owners can delete reports" ON field_training_reports;
DROP POLICY IF EXISTS "Users with field training access can view history" ON field_training_history;
DROP POLICY IF EXISTS "Authenticated users can create history records" ON field_training_history;

-- RLS Policies for field_training_settings
CREATE POLICY "Project members can view field training settings"
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

CREATE POLICY "Project members can manage field training settings"
  ON field_training_settings
  FOR ALL
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

-- RLS Policies for field_training_reports
CREATE POLICY "Users with field training access can view reports"
  ON field_training_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_training_reports.project_id
      AND personnel.field_training_access = true
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

CREATE POLICY "Users with field training access can create reports"
  ON field_training_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_training_reports.project_id
      AND personnel.field_training_access = true
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

CREATE POLICY "Report creators, organizers, planners and admins can update reports"
  ON field_training_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT field_training_reports.id FROM field_training_reports
      INNER JOIN personnel ON personnel.id = field_training_reports.organized_by_id
      WHERE personnel.user_id = auth.uid()
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
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    id IN (
      SELECT field_training_reports.id FROM field_training_reports
      INNER JOIN personnel ON personnel.id = field_training_reports.organized_by_id
      WHERE personnel.user_id = auth.uid()
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

CREATE POLICY "Admins and project admins can delete reports"
  ON field_training_reports
  FOR DELETE
  TO authenticated
  USING (
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

-- RLS Policies for field_training_history
CREATE POLICY "Users with field training access can view history"
  ON field_training_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_training_reports
      INNER JOIN personnel ON personnel.project_id = field_training_reports.project_id
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

CREATE POLICY "Authenticated users can create history records"
  ON field_training_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage policies
DROP POLICY IF EXISTS "Anyone can view training photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload training photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own training photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own training photos" ON storage.objects;

CREATE POLICY "Anyone can view training photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'field-training-photos');

CREATE POLICY "Authenticated users can upload training photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'field-training-photos');

CREATE POLICY "Users can update their own training photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'field-training-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own training photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'field-training-photos' AND auth.uid()::text = (storage.foldername(name))[1]);