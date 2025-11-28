/*
  # Update create_field_observation_report function to include observation_description

  1. Changes
    - Add `p_observation_description` parameter to the function
    - Include `observation_description` field in INSERT statement
    
  2. Notes
    - This is required for Stage 1 form creation to save the observation description
    - The field should be saved when the report is first created
*/

DROP FUNCTION IF EXISTS create_field_observation_report(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, text[]);

CREATE OR REPLACE FUNCTION create_field_observation_report(
  p_project_id uuid,
  p_company_id uuid,
  p_responsible_person_1_id uuid,
  p_responsible_person_2_id uuid DEFAULT NULL,
  p_building_id uuid DEFAULT NULL,
  p_block_id uuid DEFAULT NULL,
  p_floor_id uuid DEFAULT NULL,
  p_manufacturing_unit_id uuid DEFAULT NULL,
  p_activity_id uuid DEFAULT NULL,
  p_location_description text DEFAULT '',
  p_observation_description text DEFAULT '',
  p_severity text DEFAULT 'minor',
  p_reference_document text DEFAULT '',
  p_photos text[] DEFAULT '{}'
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
  v_actual_person_1_id uuid;
  v_actual_person_2_id uuid;
BEGIN
  -- Check if user has creator permission
  SELECT EXISTS (
    SELECT 1 FROM personnel
    WHERE personnel.user_id = auth.uid()
    AND personnel.project_id = p_project_id
    AND personnel.field_observation_creator = true
  ) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to create field observation report';
  END IF;

  -- Handle responsible person 1 - check if it's a virtual ID
  IF p_responsible_person_1_id::text LIKE 'virtual-%' THEN
    -- Extract user_id from virtual ID and get or create personnel
    v_actual_person_1_id := get_or_create_personnel(auth.uid(), p_project_id);
  ELSE
    v_actual_person_1_id := p_responsible_person_1_id;
  END IF;

  -- Handle responsible person 2 - check if it's a virtual ID
  IF p_responsible_person_2_id IS NOT NULL AND p_responsible_person_2_id::text LIKE 'virtual-%' THEN
    -- Extract user_id from virtual ID and get or create personnel
    v_actual_person_2_id := get_or_create_personnel(auth.uid(), p_project_id);
  ELSE
    v_actual_person_2_id := p_responsible_person_2_id;
  END IF;

  -- Get and update the settings in a single transaction
  SELECT id, current_number, number_prefix
  INTO v_settings_id, v_next_number, v_prefix
  FROM field_observation_settings
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF v_settings_id IS NULL THEN
    RAISE EXCEPTION 'Field observation settings not found for project';
  END IF;

  -- Increment the number
  v_next_number := v_next_number + 1;
  v_report_number := v_prefix || '-' || LPAD(v_next_number::text, 3, '0');

  -- Update the settings
  UPDATE field_observation_settings
  SET current_number = v_next_number,
      updated_at = now()
  WHERE id = v_settings_id;

  -- Create the report with actual personnel IDs and observation_description
  INSERT INTO field_observation_reports (
    project_id,
    report_number,
    status,
    company_id,
    responsible_person_1_id,
    responsible_person_2_id,
    building_id,
    block_id,
    floor_id,
    manufacturing_unit_id,
    activity_id,
    location_description,
    observation_description,
    severity,
    reference_document,
    photos,
    created_by
  ) VALUES (
    p_project_id,
    v_report_number,
    'pre_approval',
    p_company_id,
    v_actual_person_1_id,
    v_actual_person_2_id,
    p_building_id,
    p_block_id,
    p_floor_id,
    p_manufacturing_unit_id,
    p_activity_id,
    COALESCE(p_location_description, ''),
    COALESCE(p_observation_description, ''),
    COALESCE(p_severity, 'minor'),
    COALESCE(p_reference_document, ''),
    COALESCE(p_photos, '{}'),
    auth.uid()
  )
  RETURNING id INTO v_report_id;

  -- Create history record
  INSERT INTO field_observation_history (
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
    'pre_approval',
    'Form oluşturuldu'
  );

  -- Return the result
  SELECT json_build_object(
    'id', v_report_id,
    'report_number', v_report_number
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_field_observation_report TO authenticated;