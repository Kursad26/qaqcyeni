/*
  # Create Tasks and User Tasks Tables

  ## Description
  This migration creates tables for managing tasks within projects and tracking
  user progress on assigned tasks. Tasks can be assigned to multiple users.

  ## Tables Created
  
  ### tasks
  - `id` (uuid, primary key) - Unique task identifier
  - `project_id` (uuid, not null) - References projects(id)
  - `title` (text, not null) - Task title
  - `description` (text) - Task description
  - `task_type` (text, not null) - Type of task
  - `start_date` (date, not null) - Task start date
  - `end_date` (date, not null) - Task end date
  - `target_count` (integer, not null, default 0) - Target completion count
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp

  ### user_tasks
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, not null) - References tasks(id)
  - `user_id` (uuid, not null) - References user_profiles(id)
  - `status` (text, not null, default 'active') - Task status: active, completed, expired
  - `completed_count` (integer, not null, default 0) - Number of completions
  - `success_rate` (numeric) - Success rate percentage
  - `assigned_at` (timestamptz, default now()) - Assignment timestamp
  - `completed_at` (timestamptz) - Completion timestamp
  - Unique constraint on (task_id, user_id)

  ## Security
  - RLS enabled on both tables
  - Simple policies allowing authenticated users full access
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_tasks junction table with progress tracking
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  completed_count integer NOT NULL DEFAULT 0,
  success_rate numeric(5,2),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

-- Simple policies for tasks
CREATE POLICY "tasks_select_policy" 
  ON tasks FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "tasks_insert_policy" 
  ON tasks FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "tasks_update_policy" 
  ON tasks FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "tasks_delete_policy" 
  ON tasks FOR DELETE 
  TO authenticated 
  USING (true);

-- Simple policies for user_tasks
CREATE POLICY "user_tasks_select_policy" 
  ON user_tasks FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "user_tasks_insert_policy" 
  ON user_tasks FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "user_tasks_update_policy" 
  ON user_tasks FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "user_tasks_delete_policy" 
  ON user_tasks FOR DELETE 
  TO authenticated 
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(status);

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
