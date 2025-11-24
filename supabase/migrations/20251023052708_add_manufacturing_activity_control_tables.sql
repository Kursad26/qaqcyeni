/*
  # İmalat Birimleri, Aktiviteler ve Kontrol Adımları Tabloları

  1. Yeni Tablolar
    - `project_manufacturing_units` - İmalat birimleri
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `name` (text)
      - `is_active` (boolean, default: true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_activities` - Aktiviteler
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `name` (text)
      - `is_active` (boolean, default: true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_control_steps` - Kontrol adımları
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `name` (text)
      - `is_active` (boolean, default: true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Güvenlik
    - Her tablo için RLS etkinleştirildi
    - Proje üyelerine okuma ve yazma izinleri tanımlandı
*/

-- İmalat Birimleri Tablosu
CREATE TABLE IF NOT EXISTS project_manufacturing_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_manufacturing_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view manufacturing units"
  ON project_manufacturing_units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert manufacturing units"
  ON project_manufacturing_units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update manufacturing units"
  ON project_manufacturing_units FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete manufacturing units"
  ON project_manufacturing_units FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_manufacturing_units.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- Aktiviteler Tablosu
CREATE TABLE IF NOT EXISTS project_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view activities"
  ON project_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert activities"
  ON project_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update activities"
  ON project_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete activities"
  ON project_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_activities.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- Kontrol Adımları Tablosu
CREATE TABLE IF NOT EXISTS project_control_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_control_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view control steps"
  ON project_control_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert control steps"
  ON project_control_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update control steps"
  ON project_control_steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete control steps"
  ON project_control_steps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_control_steps.project_id
      AND project_users.user_id = auth.uid()
    )
  );