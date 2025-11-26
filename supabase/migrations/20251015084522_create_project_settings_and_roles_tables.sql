/*
  # Project Settings and Roles Management Tables

  ## Description
  Creates tables for comprehensive project settings including buildings, blocks,
  company categories, roles, and enhanced personnel management with permissions.

  ## New Tables

  ### 1. project_buildings
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `name` (text) - Building name
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. project_blocks
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `building_id` (uuid, foreign key to project_buildings, nullable)
  - `name` (text) - Block name (A Blok, B Blok, etc.)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. company_categories
  - Employer (İşveren)
  - Contractor (Müteahit)
  - Subcontractor (Yüklenici)

  ### 4. project_roles
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key to projects)
  - `name` (text) - Role name (Kalite Kontrol, Şantiye Şefi, Saha, etc.)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modified Tables

  ### companies
  - Add `company_category` field (employer, contractor, subcontractor)

  ### personnel
  - Add `role_id` field (foreign key to project_roles)
  - Add `company_id` field (foreign key to companies)

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated admin users only
*/

-- Create project_buildings table
CREATE TABLE IF NOT EXISTS project_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project buildings"
  ON project_buildings
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

-- Create project_blocks table
CREATE TABLE IF NOT EXISTS project_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  building_id uuid REFERENCES project_buildings(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project blocks"
  ON project_blocks
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

-- Create project_roles table
CREATE TABLE IF NOT EXISTS project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project roles"
  ON project_roles
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

-- Add company_category to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'company_category'
  ) THEN
    ALTER TABLE companies ADD COLUMN company_category text CHECK (company_category IN ('employer', 'contractor', 'subcontractor')) DEFAULT 'contractor';
  END IF;
END $$;

-- Add role_id and company_id to personnel table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE personnel ADD COLUMN role_id uuid REFERENCES project_roles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE personnel ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_buildings_project_id ON project_buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_blocks_project_id ON project_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_blocks_building_id ON project_blocks(building_id);
CREATE INDEX IF NOT EXISTS idx_project_roles_project_id ON project_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_personnel_role_id ON personnel(role_id);
CREATE INDEX IF NOT EXISTS idx_personnel_company_id ON personnel(company_id);
