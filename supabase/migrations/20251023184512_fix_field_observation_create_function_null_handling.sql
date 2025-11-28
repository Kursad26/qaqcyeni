/*
  # Fix Field Observation Report Creation Function - Null Handling

  ## Problem
  The function may fail when nullable fields are provided as null values.
  
  ## Solution
  - Update function to properly handle NULL values for optional fields
  - Ensure the function handles empty strings and null references correctly
*/

-- Drop and recreate the function with proper null handling
DROP FUNCTION IF EXISTS create_field_observation_report;

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

  -- Create the report
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
    severity,
    reference_document,
    photos,
    created_by
  ) VALUES (
    p_project_id,
    v_report_number,
    'pre_approval',
    p_company_id,
    p_responsible_person_1_id,
    NULLIF(p_responsible_person_2_id, '00000000-0000-0000-0000-000000000000'::uuid),
    p_building_id,
    p_block_id,
    p_floor_id,
    p_manufacturing_unit_id,
    p_activity_id,
    COALESCE(p_location_description, ''),
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_field_observation_report TO authenticated;
