/*
  # Create Companies and Personnel Tables

  ## Description
  This migration creates tables for managing companies and their personnel
  within projects. Each project can have multiple companies, and each company
  can have multiple personnel.

  ## Tables Created
  
  ### companies
  - `id` (uuid, primary key) - Unique company identifier
  - `project_id` (uuid, not null) - References projects(id)
  - `name` (text, not null) - Company name
  - `tax_number` (text) - Tax identification number
  - `phone` (text) - Company phone number
  - `email` (text) - Company email address
  - `address` (text) - Company address
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ### personnel
  - `id` (uuid, primary key) - Unique personnel identifier
  - `project_id` (uuid, not null) - References projects(id)
  - `company_id` (uuid, not null) - References companies(id)
  - `first_name` (text, not null) - Personnel first name
  - `last_name` (text, not null) - Personnel last name
  - `position` (text) - Job position/title
  - `phone` (text) - Phone number
  - `email` (text) - Email address
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ## Security
  - RLS enabled on both tables
  - Simple policies allowing authenticated users full access
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  tax_number text,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create personnel table
CREATE TABLE IF NOT EXISTS personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  position text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

-- Simple policies for companies
CREATE POLICY "companies_select_policy" 
  ON companies FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "companies_insert_policy" 
  ON companies FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "companies_update_policy" 
  ON companies FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "companies_delete_policy" 
  ON companies FOR DELETE 
  TO authenticated 
  USING (true);

-- Simple policies for personnel
CREATE POLICY "personnel_select_policy" 
  ON personnel FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "personnel_insert_policy" 
  ON personnel FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "personnel_update_policy" 
  ON personnel FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "personnel_delete_policy" 
  ON personnel FOR DELETE 
  TO authenticated 
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_project_id ON companies(project_id);
CREATE INDEX IF NOT EXISTS idx_personnel_project_id ON personnel(project_id);
CREATE INDEX IF NOT EXISTS idx_personnel_company_id ON personnel(company_id);

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personnel_updated_at
  BEFORE UPDATE ON personnel
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
