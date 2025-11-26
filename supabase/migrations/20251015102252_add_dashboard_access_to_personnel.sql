/*
  # Add Dashboard Access to Personnel

  1. Changes
    - Add `dashboard_access` boolean column to `personnel` table
    - Default value is false (no dashboard access)
    - Allows project admins to control which personnel can access the dashboard

  2. Notes
    - This is a non-destructive migration
    - Existing records will have dashboard_access = false by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'dashboard_access'
  ) THEN
    ALTER TABLE personnel ADD COLUMN dashboard_access boolean DEFAULT false NOT NULL;
  END IF;
END $$;