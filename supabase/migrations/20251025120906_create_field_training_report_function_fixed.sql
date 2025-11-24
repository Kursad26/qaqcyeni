-- Create function to generate training report numbers
CREATE OR REPLACE FUNCTION create_field_training_report(
  p_project_id uuid,
  p_training_topic text,
  p_organized_by_id uuid,
  p_trainer_name text,
  p_recipient_company_1_id uuid,
  p_deadline_date date,
  p_manufacturing_unit_id uuid DEFAULT NULL,
  p_recipient_company_2_id uuid DEFAULT NULL,
  p_training_type text DEFAULT 'internal'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings_id uuid;
  v_next_number integer;
  v_prefix text;
  v_report_number text;
  v_report_id uuid;
  v_has_permission boolean;
  v_result json;
BEGIN
  -- Check if user has permission
  SELECT EXISTS (
    SELECT 1 FROM personnel
    WHERE personnel.user_id = auth.uid()
    AND personnel.project_id = p_project_id
    AND personnel.field_training_access = true
  ) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = p_project_id
    AND projects.admin_id = auth.uid()
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Eğitim oluşturma yetkiniz yok';
  END IF;

  -- Get and update the settings in a single transaction
  SELECT id, current_number, number_prefix
  INTO v_settings_id, v_next_number, v_prefix
  FROM field_training_settings
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF v_settings_id IS NULL THEN
    INSERT INTO field_training_settings (project_id, number_prefix, current_number)
    VALUES (p_project_id, 'SET', 0)
    RETURNING id, current_number, number_prefix
    INTO v_settings_id, v_next_number, v_prefix;
  END IF;

  -- Increment the number
  v_next_number := v_next_number + 1;
  v_report_number := v_prefix || '-' || LPAD(v_next_number::text, 3, '0');

  -- Update the settings
  UPDATE field_training_settings
  SET current_number = v_next_number,
      updated_at = now()
  WHERE id = v_settings_id;

  -- Create the report
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
    COALESCE(p_training_type, 'internal'),
    p_deadline_date,
    auth.uid()
  )
  RETURNING id INTO v_report_id;

  -- Create history record
  INSERT INTO field_training_history (
    report_id,
    user_id,
    action,
    old_status,
    new_status,
    notes
  ) VALUES (
    v_report_id,
    auth.uid(),
    'created',
    '',
    'planned',
    'Eğitim planlandı'
  );

  -- Return the result
  SELECT json_build_object(
    'id', v_report_id,
    'report_number', v_report_number
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_field_training_report TO authenticated;