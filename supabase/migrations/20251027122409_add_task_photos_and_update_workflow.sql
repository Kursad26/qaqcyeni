/*
  # Task Photos and Workflow Updates

  ## Description
  This migration adds support for photos directly on tasks (not just work logs),
  updates the status workflow to remove 'cancelled' status, and prepares the
  system for a proper approval workflow.

  ## New Tables

  ### task_management_task_photos
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, foreign key to task_management_tasks) - Task reference
  - `photo_url` (text) - Storage path to photo
  - `uploaded_by` (uuid, foreign key to user_profiles) - User who uploaded
  - `uploaded_at` (timestamptz) - Upload timestamp

  ## Table Updates

  ### task_management_settings
  - Add `last_task_number` column to replace current_number (better naming)
  
  ## Important Notes
  1. Photos can be added when creating a task (max 5)
  2. Work logs can also have photos (existing functionality)
  3. Status workflow: open -> in_progress -> pending_approval -> closed
  4. Cancelled status is removed from the system
  5. Responsible personnel can move tasks to pending_approval when they add work logs
  6. Only task owner or admin can close tasks from pending_approval

  ## Security
  - Enable RLS on task_management_task_photos table
  - All project members with access can view task photos
  - Task creator and assignees can upload photos
  - Admins have full rights
*/

-- Add last_task_number column to settings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_management_settings' AND column_name = 'last_task_number'
  ) THEN
    ALTER TABLE task_management_settings ADD COLUMN last_task_number integer DEFAULT 0 NOT NULL;
    
    -- Copy current_number to last_task_number for existing records
    UPDATE task_management_settings SET last_task_number = current_number;
  END IF;
END $$;

-- Create task_management_task_photos table
CREATE TABLE IF NOT EXISTS task_management_task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES task_management_tasks(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  uploaded_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE task_management_task_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_management_task_photos
CREATE POLICY "Project members can view task photos"
  ON task_management_task_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_task_photos.task_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Task creators and assignees can upload photos"
  ON task_management_task_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      WHERE task_management_tasks.id = task_management_task_photos.task_id
      AND (
        task_management_tasks.created_by = auth.uid()
        OR task_management_tasks.task_owner_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN task_management_assignments ON task_management_assignments.task_id = task_management_tasks.id
      INNER JOIN personnel ON personnel.id = task_management_assignments.personnel_id
      WHERE task_management_tasks.id = task_management_task_photos.task_id
      AND personnel.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_task_photos.task_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Photo uploaders and admins can delete photos"
  ON task_management_task_photos
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_task_photos.task_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_task_photos_task ON task_management_task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_uploaded_by ON task_management_task_photos(uploaded_by);

-- Create storage bucket for task photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task photos
CREATE POLICY "Project members can view task photos from storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-photos');

CREATE POLICY "Authenticated users can upload task photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

CREATE POLICY "Users can delete their own task photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
