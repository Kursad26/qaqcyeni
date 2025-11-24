-- Migration: Add manufacturing_unit_id to noi_requests table (v2 - fixed)
-- Date: 2025-11-22

-- 1. Add manufacturing_unit_id column to noi_requests table
ALTER TABLE noi_requests 
ADD COLUMN IF NOT EXISTS manufacturing_unit_id UUID REFERENCES project_manufacturing_units(id);

-- 2. Drop old function first (with old signature)
DROP FUNCTION IF EXISTS create_noi_request(UUID, TEXT, TEXT, UUID, UUID, UUID, TEXT, UUID);

-- 3. Create new function with manufacturing_unit_id parameter
CREATE FUNCTION create_noi_request(
  p_project_id UUID,
  p_date TEXT,
  p_time TEXT,
  p_company_id UUID,
  p_const_personnel_id UUID,
  p_qc_personnel_id UUID,
  p_location TEXT,
  p_hold_point_id UUID,
  p_manufacturing_unit_id UUID DEFAULT NULL
)
RETURNS TABLE(noi_number TEXT, id UUID) AS $$
DECLARE
  v_settings RECORD;
  v_new_number INTEGER;
  v_noi_number TEXT;
  v_noi_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get NOI settings for the project
  SELECT * INTO v_settings
  FROM noi_settings
  WHERE project_id = p_project_id;

  -- If settings don't exist, create default settings
  IF v_settings IS NULL THEN
    INSERT INTO noi_settings (project_id, number_prefix, current_number)
    VALUES (p_project_id, 'NOI', 0)
    RETURNING * INTO v_settings;
  END IF;

  -- Increment the number
  v_new_number := v_settings.current_number + 1;
  v_noi_number := v_settings.number_prefix || '-' || LPAD(v_new_number::TEXT, 4, '0');

  -- Update the settings with new number
  UPDATE noi_settings
  SET current_number = v_new_number,
      updated_at = NOW()
  WHERE project_id = p_project_id;

  -- Insert new NOI request
  INSERT INTO noi_requests (
    project_id,
    noi_number,
    status,
    date,
    time,
    company_id,
    const_personnel_id,
    qc_personnel_id,
    location,
    hold_point_id,
    manufacturing_unit_id,
    revision_number,
    original_noi_number,
    created_by
  )
  VALUES (
    p_project_id,
    v_noi_number,
    'pending_approval',
    p_date,
    p_time,
    p_company_id,
    p_const_personnel_id,
    p_qc_personnel_id,
    p_location,
    p_hold_point_id,
    p_manufacturing_unit_id,
    0,
    v_noi_number,
    v_user_id
  )
  RETURNING noi_requests.id INTO v_noi_id;

  -- Return the NOI number and ID
  RETURN QUERY SELECT v_noi_number, v_noi_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_noi_request TO authenticated;

