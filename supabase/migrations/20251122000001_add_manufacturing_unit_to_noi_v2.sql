/*
  # İmalat Birimi Ekleme - NOI Modülü (v2 - Tüm fonksiyon versiyonlarını siler)

  ## Değişiklikler
  1. noi_requests tablosuna manufacturing_unit_id kolonu ekleme
  2. Tüm create_noi_request fonksiyonlarını silip yeniden oluşturma
*/

-- 1. Kolonu ekle (eğer yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'noi_requests' AND column_name = 'manufacturing_unit_id'
  ) THEN
    ALTER TABLE noi_requests
    ADD COLUMN manufacturing_unit_id uuid REFERENCES project_manufacturing_units(id) ON DELETE SET NULL;

    -- Index ekle
    CREATE INDEX idx_noi_requests_manufacturing_unit_id ON noi_requests(manufacturing_unit_id);
  END IF;
END $$;

-- 2. Tüm create_noi_request fonksiyonlarını sil (parametre sayısına bakmadan)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure
        FROM pg_proc
        WHERE proname = 'create_noi_request'
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure;
    END LOOP;
END $$;

-- 3. Yeni fonksiyonu oluştur (9 parametre - manufacturing_unit_id dahil)
CREATE OR REPLACE FUNCTION create_noi_request(
  p_project_id uuid,
  p_date date,
  p_time time,
  p_company_id uuid,
  p_const_personnel_id uuid,
  p_qc_personnel_id uuid,
  p_location text DEFAULT '',
  p_hold_point_id uuid DEFAULT NULL,
  p_manufacturing_unit_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings_id uuid;
  v_next_number integer;
  v_prefix text;
  v_noi_number text;
  v_noi_id uuid;
  v_has_permission boolean;
  v_result json;
BEGIN
  -- Check if user has noi access permission
  SELECT EXISTS (
    SELECT 1 FROM personnel
    WHERE personnel.user_id = auth.uid()
    AND personnel.project_id = p_project_id
    AND personnel.noi_access = true
  ) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to create NOI request';
  END IF;

  -- Get and update the settings in a single transaction
  SELECT id, current_number, number_prefix
  INTO v_settings_id, v_next_number, v_prefix
  FROM noi_settings
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF v_settings_id IS NULL THEN
    RAISE EXCEPTION 'NOI settings not found for project';
  END IF;

  -- Increment the number
  v_next_number := v_next_number + 1;
  v_noi_number := v_prefix || '-' || LPAD(v_next_number::text, 3, '0');

  -- Update the settings
  UPDATE noi_settings
  SET current_number = v_next_number,
      updated_at = now()
  WHERE id = v_settings_id;

  -- Create the NOI request
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
    created_by
  ) VALUES (
    p_project_id,
    v_noi_number,
    'pending_approval',
    p_date,
    p_time,
    p_company_id,
    p_const_personnel_id,
    p_qc_personnel_id,
    COALESCE(p_location, ''),
    p_hold_point_id,
    p_manufacturing_unit_id,
    auth.uid()
  )
  RETURNING id INTO v_noi_id;

  -- Create history record
  INSERT INTO noi_history (
    noi_id,
    user_id,
    action,
    old_status,
    new_status,
    notes
  ) VALUES (
    v_noi_id,
    auth.uid(),
    'created',
    '',
    'pending_approval',
    'NOI talebi oluşturuldu'
  );

  -- Return the result
  SELECT json_build_object(
    'id', v_noi_id,
    'noi_number', v_noi_number
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_noi_request TO authenticated;
