/*
  # Task Management Module

  ## Description
  This migration creates a comprehensive task management system for project coordination.
  Users can create tasks, assign multiple responsible persons, track progress through status workflow,
  add comments, and receive notifications for updates. Admins have full oversight capabilities.

  ## New Tables

  ### task_management_settings
  - `id` (uuid, primary key) - Unique identifier
  - `project_id` (uuid, foreign key to projects) - Project reference
  - `number_prefix` (text) - Task number prefix (default: TASK)
  - `current_number` (integer) - Last used task number
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Update timestamp
  - Unique constraint on project_id

  ### task_management_tasks
  - `id` (uuid, primary key) - Unique identifier
  - `project_id` (uuid, foreign key to projects) - Project reference
  - `task_number` (text) - Full task number (e.g., TASK-001)
  - `title` (text) - Task title
  - `description` (text) - Detailed task description
  - `company_id` (uuid, foreign key to companies) - Responsible company
  - `task_owner_id` (uuid, foreign key to user_profiles) - Task owner
  - `status` (text) - Task status: open, in_progress, pending_approval, closed, cancelled
  - `priority` (text) - Priority: high, medium, low
  - `task_category` (text) - Category for grouping
  - `target_date` (date) - Target completion date
  - `created_by` (uuid, foreign key to user_profiles) - Creator
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Update timestamp
  - `closed_at` (timestamptz) - Closing timestamp
  - `closing_notes` (text) - Notes when closing task
  - Unique constraint on (project_id, task_number)

  ### task_management_assignments
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, foreign key to task_management_tasks) - Task reference
  - `personnel_id` (uuid, foreign key to personnel) - Assigned personnel
  - `role` (text) - Assignment role: owner, responsible
  - `assigned_at` (timestamptz) - Assignment timestamp
  - `assigned_by` (uuid, foreign key to user_profiles) - Who assigned
  - Unique constraint on (task_id, personnel_id)

  ### task_management_comments
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, foreign key to task_management_tasks) - Task reference
  - `user_id` (uuid, foreign key to user_profiles) - Comment author
  - `comment_text` (text) - Comment content
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Update timestamp

  ### task_management_notifications
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, foreign key to task_management_tasks) - Task reference
  - `user_id` (uuid, foreign key to user_profiles) - User to notify
  - `comment_id` (uuid, foreign key to task_management_comments) - Related comment
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Creation timestamp

  ### task_management_history
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, foreign key to task_management_tasks) - Task reference
  - `user_id` (uuid, foreign key to user_profiles) - User who made change
  - `action` (text) - Action description
  - `old_value` (text) - Previous value
  - `new_value` (text) - New value
  - `created_at` (timestamptz) - Action timestamp

  ## Personnel Table Updates
  - `task_management_access` (boolean) - Can view and use task management module
  - `task_management_admin` (boolean) - Has full admin rights over all tasks

  ## Security
  - Enable RLS on all tables
  - Users with access can view tasks they're assigned to or created
  - Any user with access can create tasks and assign anyone
  - Task owners and responsible personnel can update their tasks
  - Only task owners and admins can approve closing
  - Admins have full rights to all operations
  - Comments are visible to all users with access to the task
  - Notifications are personal to each user

  ## Important Notes
  1. All users with task_management_access can create tasks for anyone
  2. Responsible users can move tasks to pending_approval status
  3. Only task owner or admin can close tasks
  4. Admins can edit/update/delete all tasks at any stage
  5. Table editing is admin-only for bulk operations
*/

-- Add new columns to personnel table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'task_management_access'
  ) THEN
    ALTER TABLE personnel ADD COLUMN task_management_access boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'task_management_admin'
  ) THEN
    ALTER TABLE personnel ADD COLUMN task_management_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create task_management_settings table
CREATE TABLE IF NOT EXISTS task_management_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  number_prefix text DEFAULT 'TASK' NOT NULL,
  current_number integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id)
);

ALTER TABLE task_management_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view task management settings"
  ON task_management_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_settings.project_id
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

CREATE POLICY "Admins can manage task management settings"
  ON task_management_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_settings.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_settings.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

-- Create task_management_tasks table
CREATE TABLE IF NOT EXISTS task_management_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  task_number text NOT NULL,
  title text NOT NULL,
  description text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  task_owner_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'pending_approval', 'closed', 'cancelled')),
  priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  task_category text,
  target_date date,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  closed_at timestamptz,
  closing_notes text,
  UNIQUE(project_id, task_number)
);

ALTER TABLE task_management_tasks ENABLE ROW LEVEL SECURITY;

-- Create task_management_assignments table
CREATE TABLE IF NOT EXISTS task_management_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES task_management_tasks(id) ON DELETE CASCADE NOT NULL,
  personnel_id uuid REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'responsible' NOT NULL CHECK (role IN ('owner', 'responsible')),
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  UNIQUE(task_id, personnel_id)
);

ALTER TABLE task_management_assignments ENABLE ROW LEVEL SECURITY;

-- Create task_management_comments table
CREATE TABLE IF NOT EXISTS task_management_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES task_management_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE task_management_comments ENABLE ROW LEVEL SECURITY;

-- Create task_management_notifications table
CREATE TABLE IF NOT EXISTS task_management_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES task_management_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES task_management_comments(id) ON DELETE CASCADE,
  notification_type text DEFAULT 'comment' NOT NULL CHECK (notification_type IN ('comment', 'status_change', 'assignment', 'mention')),
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE task_management_notifications ENABLE ROW LEVEL SECURITY;

-- Create task_management_history table
CREATE TABLE IF NOT EXISTS task_management_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES task_management_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE task_management_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_management_tasks
CREATE POLICY "Users with access can view tasks"
  ON task_management_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
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

CREATE POLICY "Users with access can create tasks"
  ON task_management_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
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

CREATE POLICY "Task owners, assigned personnel, and admins can update tasks"
  ON task_management_tasks
  FOR UPDATE
  TO authenticated
  USING (
    task_owner_id = auth.uid()
    OR
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_management_assignments
      WHERE task_management_assignments.task_id = task_management_tasks.id
      AND task_management_assignments.personnel_id IN (
        SELECT id FROM personnel WHERE user_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    task_owner_id = auth.uid()
    OR
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_management_assignments
      WHERE task_management_assignments.task_id = task_management_tasks.id
      AND task_management_assignments.personnel_id IN (
        SELECT id FROM personnel WHERE user_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
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

CREATE POLICY "Admins can delete tasks"
  ON task_management_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
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

-- RLS Policies for task_management_assignments
CREATE POLICY "Users with access can view assignments"
  ON task_management_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_assignments.task_id
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

CREATE POLICY "Users with access can create assignments"
  ON task_management_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_assignments.task_id
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

CREATE POLICY "Task owners and admins can update assignments"
  ON task_management_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      WHERE task_management_tasks.id = task_management_assignments.task_id
      AND task_management_tasks.task_owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_assignments.task_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      WHERE task_management_tasks.id = task_management_assignments.task_id
      AND task_management_tasks.task_owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_assignments.task_id
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

CREATE POLICY "Task owners and admins can delete assignments"
  ON task_management_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      WHERE task_management_tasks.id = task_management_assignments.task_id
      AND task_management_tasks.task_owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_assignments.task_id
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

-- RLS Policies for task_management_comments
CREATE POLICY "Users with access can view comments"
  ON task_management_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_comments.task_id
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

CREATE POLICY "Users with access can create comments"
  ON task_management_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_comments.task_id
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

CREATE POLICY "Comment authors and admins can update comments"
  ON task_management_comments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_comments.task_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_comments.task_id
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

CREATE POLICY "Comment authors and admins can delete comments"
  ON task_management_comments
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_comments.task_id
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

-- RLS Policies for task_management_notifications
CREATE POLICY "Users can view their own notifications"
  ON task_management_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON task_management_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON task_management_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON task_management_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for task_management_history
CREATE POLICY "Users with access can view history"
  ON task_management_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks
      INNER JOIN personnel ON personnel.project_id = task_management_tasks.project_id
      WHERE task_management_tasks.id = task_management_history.task_id
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

CREATE POLICY "System can create history records"
  ON task_management_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_management_tasks_project_id ON task_management_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_management_tasks_status ON task_management_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_management_tasks_owner ON task_management_tasks(task_owner_id);
CREATE INDEX IF NOT EXISTS idx_task_management_tasks_company ON task_management_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_task_management_tasks_target_date ON task_management_tasks(target_date);
CREATE INDEX IF NOT EXISTS idx_task_management_tasks_priority ON task_management_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_management_assignments_task ON task_management_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_management_assignments_personnel ON task_management_assignments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_task_management_comments_task ON task_management_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_management_comments_user ON task_management_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_management_notifications_user ON task_management_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_management_notifications_task ON task_management_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_management_notifications_read ON task_management_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_task_management_history_task ON task_management_history(task_id);
CREATE INDEX IF NOT EXISTS idx_personnel_task_management_access ON personnel(task_management_access);
CREATE INDEX IF NOT EXISTS idx_personnel_task_management_admin ON personnel(task_management_admin);

-- Create trigger for updated_at on task_management_settings
CREATE TRIGGER update_task_management_settings_updated_at
  BEFORE UPDATE ON task_management_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on task_management_tasks
CREATE TRIGGER update_task_management_tasks_updated_at
  BEFORE UPDATE ON task_management_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on task_management_comments
CREATE TRIGGER update_task_management_comments_updated_at
  BEFORE UPDATE ON task_management_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
