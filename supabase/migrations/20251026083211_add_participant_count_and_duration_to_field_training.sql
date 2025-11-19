/*
  # Add Participant Count and Training Duration Fields

  ## Summary
  This migration adds two new required fields to the field_training_reports table to capture important training metrics.

  ## Changes

  ### Modified Tables
  - `field_training_reports`
    - Added `participant_count` (integer) - Number of participants who attended the training
    - Added `training_duration` (integer) - Duration of the training in minutes

  ## Important Notes
  1. These fields are required for Stage 2 (Training Execution) of the training form
  2. Default values are set for existing records to maintain data integrity
  3. Both fields will be mandatory for new training reports in the application
  4. Training duration is stored in minutes for consistency
*/

-- Add participant_count column to field_training_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'participant_count'
  ) THEN
    ALTER TABLE field_training_reports ADD COLUMN participant_count integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add training_duration column to field_training_reports (in minutes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'training_duration'
  ) THEN
    ALTER TABLE field_training_reports ADD COLUMN training_duration integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN field_training_reports.participant_count IS 'Number of participants who attended the training';
COMMENT ON COLUMN field_training_reports.training_duration IS 'Duration of the training in minutes';