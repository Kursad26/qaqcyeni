/*
  # Task Categories Management

  1. New Tables
    - `task_management_categories`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `category_name` (text, unique per project)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to user_profiles)
  
  2. Changes
    - Update task_category column to reference categories table (keeping as text for now for compatibility)
  
  3. Security
    - Enable RLS on `task_management_categories` table
    - Only admins can create/update/delete categories
    - All project members can view categories
*/

CREATE TABLE IF NOT EXISTS task_management_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) NOT NULL,
  UNIQUE(project_id, category_name)
);

ALTER TABLE task_management_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view categories"
  ON task_management_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = task_management_categories.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Task management admins can insert categories"
  ON task_management_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

CREATE POLICY "Task management admins can delete categories"
  ON task_management_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_categories_project ON task_management_categories(project_id);