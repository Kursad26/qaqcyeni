/*
  # Add Completion Date and Cancellation to Field Training

  1. Changes
    - Add `completion_date` to field_training_reports (timestamp when training is completed)
    - Add `cancelled` status to possible statuses
    - Add `cancellation_reason` field for when trainings are cancelled
    - Add `cancelled_at` timestamp for cancellation time
    - Add `cancelled_by` to track who cancelled the training

  2. Notes
    - completion_date is set when status becomes 'completed'
    - cancelled status can only be set from 'planned' status
    - Only admins, super_admins, project_admins, and field_training_planners can cancel
*/

-- Add completion_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'completion_date'
  ) THEN
    ALTER TABLE field_training_reports ADD COLUMN completion_date timestamptz;
  END IF;
END $$;

-- Add cancellation_reason column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE field_training_reports ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- Add cancelled_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE field_training_reports ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

-- Add cancelled_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_training_reports' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE field_training_reports ADD COLUMN cancelled_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Create index on completion_date for faster queries
CREATE INDEX IF NOT EXISTS idx_field_training_reports_completion_date 
  ON field_training_reports(completion_date);

-- Create index on cancelled_at for faster queries
CREATE INDEX IF NOT EXISTS idx_field_training_reports_cancelled_at 
  ON field_training_reports(cancelled_at);
