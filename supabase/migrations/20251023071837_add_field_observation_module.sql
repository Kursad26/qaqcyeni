/*
  # Saha Gözlem Raporu Modülü

  ## Değişiklikler

  ### Personnel Tablosuna Yeni Kolonlar
  - `field_observation_access` (boolean) - Modülü görme yetkisi
  - `field_observation_creator` (boolean) - Rapor oluşturma yetkisi
  - `field_observation_approver` (boolean) - Rapor onaylama yetkisi

  ### Yeni Tablolar

  #### field_observation_settings
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `number_prefix` (text) - Form numarası prefix (RKG-MPK-SOR)
  - `current_number` (integer) - Son kullanılan form numarası
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  #### field_observation_reports
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `report_number` (text) - Tam form numarası (RKG-MPK-SOR-001)
  - `status` (text) - Form durumu
  - `company_id` (uuid, foreign key to companies) - Sorumlu firma
  - `responsible_person_1_id` (uuid, foreign key to personnel) - Sorumlu personel 1
  - `responsible_person_2_id` (uuid, foreign key to personnel) - Sorumlu personel 2 (opsiyonel)
  - `building_id` (uuid, foreign key to project_buildings)
  - `block_id` (uuid, foreign key to project_blocks)
  - `floor_id` (uuid, foreign key to project_floors)
  - `manufacturing_unit_id` (uuid, foreign key to project_manufacturing_units)
  - `activity_id` (uuid, foreign key to project_activities)
  - `location_description` (text) - Lokasyon ek açıklama
  - `severity` (text) - Majör veya Minör
  - `reference_document` (text)
  - `photos` (text[]) - Fotoğraf URL'leri array
  - `root_cause` (text) - Kök sebep (sorumlu personel girer)
  - `suggested_action` (text) - Önerilen faaliyet
  - `corrective_action_required` (boolean) - Düzeltici faaliyet gerekli mi
  - `planned_close_date` (date) - Planlanan kapama tarihi
  - `closing_action` (text) - Alınan aksiyon
  - `closing_photos` (text[]) - Kapama fotoğrafları
  - `rejection_reason` (text) - Red sebebi
  - `created_by` (uuid, foreign key to user_profiles) - Formu açan kişi
  - `created_at` (timestamptz)
  - `data_entry_date` (timestamptz) - Sorumlu personel veri giriş tarihi
  - `closing_date` (timestamptz) - Kapama tarihi
  - `approved_date` (timestamptz) - Onay tarihi
  - `updated_at` (timestamptz)

  #### field_observation_history
  - `id` (uuid, primary key)
  - `report_id` (uuid, foreign key to field_observation_reports)
  - `user_id` (uuid, foreign key to user_profiles)
  - `action` (text) - Yapılan işlem
  - `old_status` (text)
  - `new_status` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for authenticated users based on project membership
  - Special policies for admins and approvers
*/

-- Add new columns to personnel table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'field_observation_access'
  ) THEN
    ALTER TABLE personnel ADD COLUMN field_observation_access boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'field_observation_creator'
  ) THEN
    ALTER TABLE personnel ADD COLUMN field_observation_creator boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'field_observation_approver'
  ) THEN
    ALTER TABLE personnel ADD COLUMN field_observation_approver boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create field_observation_settings table
CREATE TABLE IF NOT EXISTS field_observation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  number_prefix text DEFAULT 'FOR' NOT NULL,
  current_number integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id)
);

ALTER TABLE field_observation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view field observation settings"
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

CREATE POLICY "Admins can manage field observation settings"
  ON field_observation_settings
  FOR ALL
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

-- Create field_observation_reports table
CREATE TABLE IF NOT EXISTS field_observation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  report_number text NOT NULL,
  status text DEFAULT 'pre_approval' NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  responsible_person_1_id uuid REFERENCES personnel(id) ON DELETE SET NULL,
  responsible_person_2_id uuid REFERENCES personnel(id) ON DELETE SET NULL,
  building_id uuid REFERENCES project_buildings(id) ON DELETE SET NULL,
  block_id uuid REFERENCES project_blocks(id) ON DELETE SET NULL,
  floor_id uuid REFERENCES project_floors(id) ON DELETE SET NULL,
  manufacturing_unit_id uuid REFERENCES project_manufacturing_units(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES project_activities(id) ON DELETE SET NULL,
  location_description text,
  severity text DEFAULT 'minor' NOT NULL,
  reference_document text,
  photos text[] DEFAULT '{}',
  root_cause text,
  suggested_action text,
  corrective_action_required boolean,
  planned_close_date date,
  closing_action text,
  closing_photos text[] DEFAULT '{}',
  rejection_reason text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  data_entry_date timestamptz,
  closing_date timestamptz,
  approved_date timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, report_number)
);

ALTER TABLE field_observation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with field observation access can view reports"
  ON field_observation_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with creator permission can create reports"
  ON field_observation_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_creator = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Report creators, responsible personnel, approvers and admins can update reports"
  ON field_observation_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT field_observation_reports.id FROM field_observation_reports
      INNER JOIN personnel ON (
        personnel.id = field_observation_reports.responsible_person_1_id
        OR personnel.id = field_observation_reports.responsible_person_2_id
      )
      WHERE personnel.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_approver = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    id IN (
      SELECT field_observation_reports.id FROM field_observation_reports
      INNER JOIN personnel ON (
        personnel.id = field_observation_reports.responsible_person_1_id
        OR personnel.id = field_observation_reports.responsible_person_2_id
      )
      WHERE personnel.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = field_observation_reports.project_id
      AND personnel.field_observation_approver = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete reports"
  ON field_observation_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create field_observation_history table
CREATE TABLE IF NOT EXISTS field_observation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES field_observation_reports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE field_observation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with field observation access can view history"
  ON field_observation_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_observation_reports
      INNER JOIN personnel ON personnel.project_id = field_observation_reports.project_id
      WHERE field_observation_reports.id = field_observation_history.report_id
      AND personnel.user_id = auth.uid()
      AND personnel.field_observation_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can create history records"
  ON field_observation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_observation_reports_project_id ON field_observation_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_field_observation_reports_status ON field_observation_reports(status);
CREATE INDEX IF NOT EXISTS idx_field_observation_reports_created_by ON field_observation_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_field_observation_reports_responsible_1 ON field_observation_reports(responsible_person_1_id);
CREATE INDEX IF NOT EXISTS idx_field_observation_reports_responsible_2 ON field_observation_reports(responsible_person_2_id);
CREATE INDEX IF NOT EXISTS idx_field_observation_history_report_id ON field_observation_history(report_id);
CREATE INDEX IF NOT EXISTS idx_personnel_field_observation_access ON personnel(field_observation_access);
CREATE INDEX IF NOT EXISTS idx_personnel_field_observation_creator ON personnel(field_observation_creator);
CREATE INDEX IF NOT EXISTS idx_personnel_field_observation_approver ON personnel(field_observation_approver);
