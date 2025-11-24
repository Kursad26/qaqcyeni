/*
  # Add observation_description field to field_observation_reports table

  1. Changes
    - Add `observation_description` column to `field_observation_reports` table
      - Type: text
      - Required field (NOT NULL with default empty string for existing records)
      - This field will store the detailed description of the non-conformity/observation from Stage 1
    
  2. Notes
    - This field is different from `root_cause` (which is filled in Stage 3)
    - `observation_description` is filled during initial form creation (Stage 1)
    - `root_cause` is filled during data entry phase (Stage 3)
*/

-- Add observation_description column to field_observation_reports table
ALTER TABLE field_observation_reports 
ADD COLUMN IF NOT EXISTS observation_description text NOT NULL DEFAULT '';

-- Add a comment to the column for documentation
COMMENT ON COLUMN field_observation_reports.observation_description IS 'Detailed description of the non-conformity or observation, filled during Stage 1 (Form Creation)';