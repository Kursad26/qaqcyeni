/*
  # Aktivite ID Ekleme - Field Training Modülü

  ## Değişiklikler
  1. field_training_reports tablosuna activity_id kolonu ekleme
  2. create_field_training_report fonksiyonunu güncelleme (activity_id parametresi ekleme)
  3. Index ekleme
*/

-- 1. Kolonu ekle (eğer yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'activity_id'
  ) THEN
    ALTER TABLE field_training_reports
    ADD COLUMN activity_id uuid REFERENCES project_activities(id) ON DELETE SET NULL;

    -- Index ekle
    CREATE INDEX idx_field_training_reports_activity_id ON field_training_reports(activity_id);

    -- Comment ekle
    COMMENT ON COLUMN field_training_reports.activity_id IS
    'Foreign key to activity. Defines which activity this training is for.';
  END IF;
END $$;

-- 2. Tüm create_field_training_report fonksiyonlarını sil (parametre sayısına bakmadan)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure
        FROM pg_proc
        WHERE proname = 'create_field_training_report'
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure;
    END LOOP;
END $$;

-- 3. Yeni fonksiyonu oluştur (10 parametre - activity_id dahil)
CREATE OR REPLACE FUNCTION create_field_training_report(
  p_project_id uuid,
  p_training_topic text,
  p_manufacturing_unit_id uuid,
  p_organized_by_id uuid,
  p_trainer_name text,
  p_recipient_company_1_id uuid,
  p_recipient_company_2_id uuid,
  p_training_type text,
  p_deadline_date date,
  p_activity_id uuid DEFAULT NULL
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
    activity_id,
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
    p_activity_id,
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

GRANT EXECUTE ON FUNCTION create_field_training_report TO authenticated;

COMMENT ON FUNCTION create_field_training_report IS
'Creates a new field training report with automatic numbering. Includes manufacturing_unit_id and activity_id for hierarchical structure.';
