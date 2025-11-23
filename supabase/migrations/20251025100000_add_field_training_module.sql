/*
  # Saha Eğitimleri Modülü

  ## Değişiklikler

  ### Personnel Tablosuna Yeni Kolonlar
  - `field_training_access` (boolean) - Modülü görme yetkisi
  - `field_training_planner` (boolean) - Eğitim planlama yetkisi

  ### Yeni Tablolar

  #### field_training_settings
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `number_prefix` (text) - Form numarası prefix
  - `current_number` (integer) - Son kullanılan form numarası
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  #### field_training_reports
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `report_number` (text) - Tam form numarası
  - `status` (text) - Form durumu (planned, awaiting_approval, completed)
  - `training_topic` (text) - Eğitim konusu
  - `manufacturing_unit_id` (uuid) - İmalat birimi
  - `organized_by_id` (uuid) - Eğitimi düzenleyen personel
  - `trainer_name` (text) - Eğitimi veren
  - `recipient_company_1_id` (uuid) - Eğitimi alacak firma 1
  - `recipient_company_2_id` (uuid) - Eğitimi alacak firma 2 (opsiyonel)
  - `training_type` (text) - İç eğitim / Dış eğitim
  - `deadline_date` (date) - Eğitim son tarihi
  - `delivery_date` (date) - Eğitim veriliş tarihi
  - `training_content` (text) - Eğitim içeriği (zengin metin)
  - `photos` (text[]) - Eğitim fotoğrafları
  - `rejection_reason` (text) - Red sebebi
  - `created_by` (uuid, foreign key to user_profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  #### field_training_history
  - `id` (uuid, primary key)
  - `report_id` (uuid, foreign key to field_training_reports)
  - `user_id` (uuid, foreign key to user_profiles)
  - `action` (text) - Yapılan işlem
  - `old_status` (text)
  - `new_status` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for authenticated users based on project membership and permissions
*/

-- Add new columns to personnel table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'field_training_access'
  ) THEN
    ALTER TABLE personnel ADD COLUMN field_training_access boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'field_training_planner'
  ) THEN
    ALTER TABLE personnel ADD COLUMN field_training_planner boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create field_training_settings table
CREATE TABLE IF NOT EXISTS field_training_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  number_prefix text DEFAULT 'SET' NOT NULL,
  current_number integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id)
);

ALTER TABLE field_training_settings ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Admins and project owners can manage field training settings"
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
      SELECT 1 FROM projects
      WHERE projects.id = field_training_settings.project_id
      AND projects.owner_id = auth.uid()
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
      SELECT 1 FROM projects
      WHERE projects.id = field_training_settings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Create field_training_reports table
CREATE TABLE IF NOT EXISTS field_training_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  report_number text NOT NULL,
  status text DEFAULT 'planned' NOT NULL,
  training_topic text NOT NULL,
  manufacturing_unit_id uuid REFERENCES project_manufacturing_units(id) ON DELETE SET NULL,
  organized_by_id uuid REFERENCES personnel(id) ON DELETE SET NULL NOT NULL,
  trainer_name text NOT NULL,
  recipient_company_1_id uuid REFERENCES companies(id) ON DELETE SET NULL NOT NULL,
  recipient_company_2_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  training_type text DEFAULT 'internal' NOT NULL,
  deadline_date date NOT NULL,
  delivery_date date,
  training_content text,
  photos text[] DEFAULT '{}',
  rejection_reason text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, report_number)
);

ALTER TABLE field_training_reports ENABLE ROW LEVEL SECURITY;

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
      AND projects.owner_id = auth.uid()
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
      AND projects.owner_id = auth.uid()
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
      AND projects.owner_id = auth.uid()
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
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins and project owners can delete reports"
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
      AND projects.owner_id = auth.uid()
    )
  );

-- Create field_training_history table
CREATE TABLE IF NOT EXISTS field_training_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES field_training_reports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE field_training_history ENABLE ROW LEVEL SECURITY;

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

-- Create function to generate training report numbers
CREATE OR REPLACE FUNCTION create_field_training_report(
  p_project_id uuid,
  p_training_topic text,
  p_manufacturing_unit_id uuid,
  p_organized_by_id uuid,
  p_trainer_name text,
  p_recipient_company_1_id uuid,
  p_recipient_company_2_id uuid,
  p_training_type text,
  p_deadline_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings field_training_settings%ROWTYPE;
  v_new_number integer;
  v_report_number text;
  v_report_id uuid;
BEGIN
  -- Get or create settings
  SELECT * INTO v_settings
  FROM field_training_settings
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO field_training_settings (project_id, number_prefix, current_number)
    VALUES (p_project_id, 'SET', 0)
    RETURNING * INTO v_settings;
  END IF;

  -- Increment number
  v_new_number := v_settings.current_number + 1;
  v_report_number := v_settings.number_prefix || '-' || LPAD(v_new_number::text, 3, '0');

  -- Update settings
  UPDATE field_training_settings
  SET current_number = v_new_number,
      updated_at = now()
  WHERE id = v_settings.id;

  -- Create report
  INSERT INTO field_training_reports (
    project_id,
    report_number,
    status,
    training_topic,
    manufacturing_unit_id,
    organized_by_id,
    trainer_name,
    recipient_company_1_id,
    recipient_company_2_id,
    training_type,
    deadline_date,
    created_by
  ) VALUES (
    p_project_id,
    v_report_number,
    'planned',
    p_training_topic,
    p_manufacturing_unit_id,
    p_organized_by_id,
    p_trainer_name,
    p_recipient_company_1_id,
    p_recipient_company_2_id,
    p_training_type,
    p_deadline_date,
    auth.uid()
  )
  RETURNING id INTO v_report_id;

  RETURN json_build_object('id', v_report_id, 'report_number', v_report_number);
END;
$$;

-- Create storage bucket for training photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-training-photos', 'field-training-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for training photos
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_training_reports_project_id ON field_training_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_field_training_reports_status ON field_training_reports(status);
CREATE INDEX IF NOT EXISTS idx_field_training_reports_created_by ON field_training_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_field_training_reports_organized_by ON field_training_reports(organized_by_id);
CREATE INDEX IF NOT EXISTS idx_field_training_history_report_id ON field_training_history(report_id);
CREATE INDEX IF NOT EXISTS idx_personnel_field_training_access ON personnel(field_training_access);
CREATE INDEX IF NOT EXISTS idx_personnel_field_training_planner ON personnel(field_training_planner);
