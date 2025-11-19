/*
  # Add is_active column to companies table

  1. Changes
    - Add `is_active` boolean column to `companies` table
    - Default value is true (active by default)
    - Allows project admins to activate/deactivate companies

  2. Notes
    - This is a non-destructive migration
    - Existing records will have is_active = true by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE companies ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;