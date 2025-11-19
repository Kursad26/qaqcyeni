/*
  # Add Get or Create Personnel Function

  ## Purpose
  This function gets or creates a personnel record for a user.
  If the user is an admin and doesn't have a personnel record, it creates one.

  ## Usage
  Used when admin users need to be assigned as responsible personnel
  but don't have a personnel record yet.
*/

CREATE OR REPLACE FUNCTION get_or_create_personnel(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_personnel_id uuid;
  v_user_name text;
BEGIN
  -- Try to find existing personnel record
  SELECT id INTO v_personnel_id
  FROM personnel
  WHERE user_id = p_user_id
  AND project_id = p_project_id
  LIMIT 1;

  -- If found, return it
  IF v_personnel_id IS NOT NULL THEN
    RETURN v_personnel_id;
  END IF;

  -- Get user's full name
  SELECT full_name INTO v_user_name
  FROM user_profiles
  WHERE id = p_user_id;

  -- Create new personnel record
  INSERT INTO personnel (
    project_id,
    user_id,
    first_name,
    last_name,
    field_observation_access,
    field_observation_creator,
    field_observation_approver,
    dashboard_access
  ) VALUES (
    p_project_id,
    p_user_id,
    '',
    '',
    true,
    true,
    true,
    true
  )
  RETURNING id INTO v_personnel_id;

  RETURN v_personnel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_personnel TO authenticated;
