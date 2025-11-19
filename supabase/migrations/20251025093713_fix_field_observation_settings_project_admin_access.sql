/*
  # Field Observation Settings - Project Admin Access

  ## Değişiklikler
  
  ### Security
  - Proje admin'lerine field observation settings'i güncelleme yetkisi ekle
  - Super admin ve admin'lerin yanı sıra proje admin'leri de ayarları değiştirebilmeli
  
  ## Önemli Notlar
  - Her proje kendi numaralandırma sistemine sahip
  - Proje admin'i, sistem admin'i veya super admin bu ayarları güncelleyebilir
  - Yeni form oluşturulduğunda güncel prefix kullanılır
*/

-- Project admins can also update field observation settings
CREATE POLICY "Project admins can update field observation settings"
  ON field_observation_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
  );

-- Project admins can also insert field observation settings
CREATE POLICY "Project admins can insert field observation settings"
  ON field_observation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = field_observation_settings.project_id
      AND projects.admin_id = auth.uid()
    )
  );