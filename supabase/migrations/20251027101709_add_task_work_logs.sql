/*
  # Task Work Logs with Photo Upload

  1. New Tables
    - `task_management_work_logs`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to task_management_tasks)
      - `personnel_id` (uuid, foreign key to personnel)
      - `log_description` (text, required for status change)
      - `created_at` (timestamp)
    
    - `task_management_work_log_photos`
      - `id` (uuid, primary key)
      - `work_log_id` (uuid, foreign key to task_management_work_logs)
      - `photo_url` (text, storage path)
      - `uploaded_at` (timestamp)
  
  2. Storage
    - Create storage bucket for work log photos
  
  3. Security
    - Enable RLS on both tables
    - Responsible persons can create work logs
    - All project members can view work logs
*/

CREATE TABLE IF NOT EXISTS task_management_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES task_management_tasks(id) ON DELETE CASCADE NOT NULL,
  personnel_id uuid REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
  log_description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_management_work_log_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id uuid REFERENCES task_management_work_logs(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE task_management_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_work_log_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view work logs"
  ON task_management_work_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      JOIN project_users ON project_users.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_work_logs.task_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Responsible persons can create work logs"
  ON task_management_work_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_assignments
      JOIN personnel ON personnel.id = task_management_assignments.personnel_id
      WHERE task_management_assignments.task_id = task_management_work_logs.task_id
      AND task_management_assignments.personnel_id = task_management_work_logs.personnel_id
      AND personnel.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view work log photos"
  ON task_management_work_log_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_work_logs
      JOIN task_management_tasks ON task_management_tasks.id = task_management_work_logs.task_id
      JOIN project_users ON project_users.project_id = task_management_tasks.project_id
      WHERE task_management_work_logs.id = task_management_work_log_photos.work_log_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Work log creators can insert photos"
  ON task_management_work_log_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_work_logs
      JOIN personnel ON personnel.id = task_management_work_logs.personnel_id
      WHERE task_management_work_logs.id = task_management_work_log_photos.work_log_id
      AND personnel.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_work_logs_task ON task_management_work_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_work_log_photos_log ON task_management_work_log_photos(work_log_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-work-log-photos', 'task-work-log-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Project members can view work log photos from storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-work-log-photos');

CREATE POLICY "Authenticated users can upload work log photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-work-log-photos');