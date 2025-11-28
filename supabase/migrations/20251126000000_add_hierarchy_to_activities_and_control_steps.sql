/*
  # Hiyerarşik Yapı Ekle: İmalat Birimi → Aktivite → Kontrol Adımı

  ## Değişiklikler
  1. project_activities tablosuna manufacturing_unit_id kolonu ekle (ZORUNLU)
  2. project_control_steps tablosuna activity_id kolonu ekle (ZORUNLU)
  3. Performans için indexler ekle

  ## Hiyerarşi
  - İmalat Birimi (Manufacturing Unit)
    └─ Aktivite (Activity) - manufacturing_unit_id ile bağlı
       └─ Kontrol Adımı (Control Step) - activity_id ile bağlı

  ## Geriye Uyumluluk
  - Mevcut veriler için NULL olarak başlayacak
  - Admin panelinden manuel olarak ilişkilendirilecek
  - Sonrasında NOT NULL constraint eklenecek
*/

-- STEP 1: Add foreign key columns (nullable for existing data)
ALTER TABLE project_activities
ADD COLUMN IF NOT EXISTS manufacturing_unit_id UUID REFERENCES project_manufacturing_units(id) ON DELETE CASCADE;

ALTER TABLE project_control_steps
ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES project_activities(id) ON DELETE CASCADE;

-- STEP 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_manufacturing_unit
ON project_activities(manufacturing_unit_id);

CREATE INDEX IF NOT EXISTS idx_activities_project_and_unit
ON project_activities(project_id, manufacturing_unit_id);

CREATE INDEX IF NOT EXISTS idx_control_steps_activity
ON project_control_steps(activity_id);

CREATE INDEX IF NOT EXISTS idx_control_steps_project_and_activity
ON project_control_steps(project_id, activity_id);

-- STEP 3: Add comments for documentation
COMMENT ON COLUMN project_activities.manufacturing_unit_id IS
'Foreign key to manufacturing unit. Defines which manufacturing unit this activity belongs to.';

COMMENT ON COLUMN project_control_steps.activity_id IS
'Foreign key to activity. Defines which activity this control step belongs to.';

-- STEP 4: Add helper function to get activity tree
CREATE OR REPLACE FUNCTION get_activity_tree(p_project_id UUID)
RETURNS TABLE (
  manufacturing_unit_id UUID,
  manufacturing_unit_name TEXT,
  activity_id UUID,
  activity_name TEXT,
  control_step_id UUID,
  control_step_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mu.id as manufacturing_unit_id,
    mu.name as manufacturing_unit_name,
    a.id as activity_id,
    a.name as activity_name,
    cs.id as control_step_id,
    cs.name as control_step_name
  FROM project_manufacturing_units mu
  LEFT JOIN project_activities a ON a.manufacturing_unit_id = mu.id
  LEFT JOIN project_control_steps cs ON cs.activity_id = a.id
  WHERE mu.project_id = p_project_id
    AND mu.is_active = true
    AND (a.is_active = true OR a.id IS NULL)
    AND (cs.is_active = true OR cs.id IS NULL)
  ORDER BY mu.name, a.name, cs.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_activity_tree IS
'Returns hierarchical tree structure: Manufacturing Unit -> Activity -> Control Step for a given project';
