/*
  # Create Nonconformities Table

  ## Description
  This migration creates a table for tracking nonconformities (quality issues)
  within projects. Nonconformities can be reported and tracked throughout
  their lifecycle from open to closed status.

  ## Tables Created
  
  ### nonconformities
  - `id` (uuid, primary key) - Unique nonconformity identifier
  - `project_id` (uuid, not null) - References projects(id)
  - `reported_by` (uuid, not null) - References user_profiles(id) - User who reported
  - `assigned_to` (uuid) - References user_profiles(id) - User assigned to fix
  - `title` (text, not null) - Nonconformity title
  - `description` (text) - Detailed description
  - `severity` (text, not null, default 'medium') - Severity: low, medium, high, critical
  - `status` (text, not null, default 'open') - Status: open, in_progress, resolved, closed
  - `location` (text) - Location where nonconformity was found
  - `reported_at` (timestamptz, default now()) - Report timestamp
  - `resolved_at` (timestamptz) - Resolution timestamp
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ## Security
  - RLS enabled on table
  - Simple policies allowing authenticated users full access
*/

-- Create nonconformities table
CREATE TABLE IF NOT EXISTS nonconformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  location text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE nonconformities ENABLE ROW LEVEL SECURITY;

-- Simple policies for nonconformities
CREATE POLICY "nonconformities_select_policy" 
  ON nonconformities FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "nonconformities_insert_policy" 
  ON nonconformities FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "nonconformities_update_policy" 
  ON nonconformities FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "nonconformities_delete_policy" 
  ON nonconformities FOR DELETE 
  TO authenticated 
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nonconformities_project_id ON nonconformities(project_id);
CREATE INDEX IF NOT EXISTS idx_nonconformities_reported_by ON nonconformities(reported_by);
CREATE INDEX IF NOT EXISTS idx_nonconformities_assigned_to ON nonconformities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_nonconformities_severity ON nonconformities(severity);
CREATE INDEX IF NOT EXISTS idx_nonconformities_status ON nonconformities(status);
CREATE INDEX IF NOT EXISTS idx_nonconformities_reported_at ON nonconformities(reported_at);

-- Create trigger for updated_at
CREATE TRIGGER update_nonconformities_updated_at
  BEFORE UPDATE ON nonconformities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
