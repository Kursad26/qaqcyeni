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

-- Create storage bucket for training photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-training-photos', 'field-training-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_training_reports_project_id ON field_training_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_field_training_reports_status ON field_training_reports(status);
CREATE INDEX IF NOT EXISTS idx_field_training_reports_created_by ON field_training_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_field_training_reports_organized_by ON field_training_reports(organized_by_id);
CREATE INDEX IF NOT EXISTS idx_field_training_history_report_id ON field_training_history(report_id);
CREATE INDEX IF NOT EXISTS idx_personnel_field_training_access ON personnel(field_training_access);
CREATE INDEX IF NOT EXISTS idx_personnel_field_training_planner ON personnel(field_training_planner);