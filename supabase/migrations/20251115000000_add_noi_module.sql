/*
  # NOI (Notice of Inspection - Teslimat Talebi) Modülü

  ## Değişiklikler

  ### Personnel Tablosuna Yeni Kolonlar
  - `noi_access` (boolean) - Modülü görme yetkisi
  - `noi_approver` (boolean) - NOI onaylama yetkisi

  ### Yeni Tablolar

  #### noi_settings
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `number_prefix` (text) - NOI numarası prefix (örn: NOI, RKG-MPK-NOI)
  - `current_number` (integer) - Son kullanılan NOI numarası
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  #### noi_requests
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `noi_number` (text) - Tam NOI numarası
  - `status` (text) - NOI durumu (pending_approval, approved, rejected, cancelled)
  - `date` (date) - NOI tarihi
  - `time` (time) - NOI saati
  - `company_id` (uuid, foreign key to companies) - Firma
  - `const_personnel_id` (uuid, foreign key to personnel) - Const Personel
  - `qc_personnel_id` (uuid, foreign key to personnel) - QC Personel
  - `location` (text) - Mahal
  - `hold_point_id` (uuid, foreign key to project_control_steps) - Hold Point
  - `approval_decision` (text) - Kabul/Red (Kabul, Red)
  - `delivery_time_minutes` (integer) - Teslimat Süresi (Dk)
  - `time_loss_group` (text) - Kayıp Zaman Grup
  - `notes` (text) - Açıklama
  - `postponed_date` (date) - Ertelenmiş tarih
  - `revision_number` (integer) - Revizyon numarası (0, 1, 2...)
  - `original_noi_number` (text) - Orijinal NOI numarası (revize edildiyse)
  - `created_by` (uuid, foreign key to user_profiles) - NOI'yi oluşturan kişi
  - `created_at` (timestamptz)
  - `approved_date` (timestamptz) - Onay tarihi
  - `rejected_date` (timestamptz) - Red tarihi
  - `cancelled_date` (timestamptz) - İptal tarihi
  - `updated_at` (timestamptz)

  #### noi_history
  - `id` (uuid, primary key)
  - `noi_id` (uuid, foreign key to noi_requests)
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
    WHERE table_name = 'personnel' AND column_name = 'noi_access'
  ) THEN
    ALTER TABLE personnel ADD COLUMN noi_access boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'noi_approver'
  ) THEN
    ALTER TABLE personnel ADD COLUMN noi_approver boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create noi_settings table
CREATE TABLE IF NOT EXISTS noi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  number_prefix text DEFAULT 'NOI' NOT NULL,
  current_number integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id)
);

ALTER TABLE noi_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view noi settings"
  ON noi_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = noi_settings.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage noi settings"
  ON noi_settings
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

-- Create noi_requests table
CREATE TABLE IF NOT EXISTS noi_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  noi_number text NOT NULL,
  status text DEFAULT 'pending_approval' NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  const_personnel_id uuid REFERENCES personnel(id) ON DELETE SET NULL,
  qc_personnel_id uuid REFERENCES personnel(id) ON DELETE SET NULL,
  location text,
  hold_point_id uuid REFERENCES project_control_steps(id) ON DELETE SET NULL,
  approval_decision text,
  delivery_time_minutes integer,
  time_loss_group text,
  notes text,
  postponed_date date,
  revision_number integer DEFAULT 0 NOT NULL,
  original_noi_number text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  approved_date timestamptz,
  rejected_date timestamptz,
  cancelled_date timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, noi_number)
);

ALTER TABLE noi_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with noi access can view requests"
  ON noi_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = noi_requests.project_id
      AND personnel.noi_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with noi access can create requests"
  ON noi_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = noi_requests.project_id
      AND personnel.noi_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Creators, approvers and admins can update requests"
  ON noi_requests
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = noi_requests.project_id
      AND personnel.noi_approver = true
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
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.user_id = auth.uid()
      AND personnel.project_id = noi_requests.project_id
      AND personnel.noi_approver = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete requests"
  ON noi_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create noi_history table
CREATE TABLE IF NOT EXISTS noi_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  noi_id uuid REFERENCES noi_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE noi_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with noi access can view history"
  ON noi_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM noi_requests
      INNER JOIN personnel ON personnel.project_id = noi_requests.project_id
      WHERE noi_requests.id = noi_history.noi_id
      AND personnel.user_id = auth.uid()
      AND personnel.noi_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can create history records"
  ON noi_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_noi_requests_project_id ON noi_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_noi_requests_status ON noi_requests(status);
CREATE INDEX IF NOT EXISTS idx_noi_requests_created_by ON noi_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_noi_requests_company_id ON noi_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_noi_requests_const_personnel_id ON noi_requests(const_personnel_id);
CREATE INDEX IF NOT EXISTS idx_noi_requests_qc_personnel_id ON noi_requests(qc_personnel_id);
CREATE INDEX IF NOT EXISTS idx_noi_history_noi_id ON noi_history(noi_id);
CREATE INDEX IF NOT EXISTS idx_personnel_noi_access ON personnel(noi_access);
CREATE INDEX IF NOT EXISTS idx_personnel_noi_approver ON personnel(noi_approver);

-- Create trigger for updated_at
CREATE TRIGGER update_noi_settings_updated_at
  BEFORE UPDATE ON noi_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_noi_requests_updated_at
  BEFORE UPDATE ON noi_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to create NOI request with automatic numbering
CREATE OR REPLACE FUNCTION create_noi_request(
  p_project_id uuid,
  p_date date,
  p_time time,
  p_company_id uuid,
  p_const_personnel_id uuid,
  p_qc_personnel_id uuid,
  p_location text DEFAULT '',
  p_hold_point_id uuid DEFAULT NULL
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
