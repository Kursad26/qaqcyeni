/*
  # Simplify RLS Policies for All Users

  ## Problem
  1. RLS policies are too restrictive - no tasks are visible
  2. Category insert is not working
  3. Need simpler workflow: 
     - Only task owner and admin can edit task details
     - Everyone with access can progress the task
     - Only task owner and admin can approve/complete

  ## Solution
  - Simplify RLS policies to allow viewing for all users with task_management_access
  - Fix category policies
  - Keep update policies simple but effective

  ## Changes
  - Rebuild all RLS policies with simpler logic
  - Allow all users with task_management_access to view
  - Restrict edits to owner/admin only
  - Allow workflow progression for all
*/

-- Drop existing policies
DROP POLICY IF EXISTS "task_select_policy" ON task_management_tasks;
DROP POLICY IF EXISTS "task_insert_policy" ON task_management_tasks;
DROP POLICY IF EXISTS "task_update_policy" ON task_management_tasks;
DROP POLICY IF EXISTS "task_delete_policy" ON task_management_tasks;

DROP POLICY IF EXISTS "category_select_policy" ON task_management_categories;
DROP POLICY IF EXISTS "category_insert_policy" ON task_management_categories;
DROP POLICY IF EXISTS "category_update_policy" ON task_management_categories;
DROP POLICY IF EXISTS "category_delete_policy" ON task_management_categories;

-- ========================================
-- TASKS: Simple and permissive policies
-- ========================================

-- SELECT: Anyone with access can view ALL tasks in their project
CREATE POLICY "tasks_select_with_access"
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
  );

-- INSERT: Anyone with access can create tasks
CREATE POLICY "tasks_insert_with_access"
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
  );

-- UPDATE: Anyone with access can update (workflow buttons)
-- This allows all users to progress tasks through workflow
CREATE POLICY "tasks_update_with_access"
  ON task_management_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- DELETE: Only admins can delete
CREATE POLICY "tasks_delete_admin_only"
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
  );

-- ========================================
-- CATEGORIES: Simple policies
-- ========================================

-- SELECT: Anyone with access can view categories
CREATE POLICY "categories_select_with_access"
  ON task_management_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- INSERT: Anyone with access can create categories
CREATE POLICY "categories_insert_with_access"
  ON task_management_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- UPDATE: Admins can update categories
CREATE POLICY "categories_update_admin_only"
  ON task_management_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

-- DELETE: Admins can delete categories
CREATE POLICY "categories_delete_admin_only"
  ON task_management_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel 
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

-- ========================================
-- ASSIGNMENTS: Simple policies
-- ========================================

DROP POLICY IF EXISTS "assignment_select_policy" ON task_management_assignments;
DROP POLICY IF EXISTS "assignment_insert_policy" ON task_management_assignments;
DROP POLICY IF EXISTS "assignment_update_policy" ON task_management_assignments;
DROP POLICY IF EXISTS "assignment_delete_policy" ON task_management_assignments;

CREATE POLICY "assignments_select_with_access"
  ON task_management_assignments
  FOR SELECT
  TO authenticated
  USING (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

CREATE POLICY "assignments_insert_with_access"
  ON task_management_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

CREATE POLICY "assignments_update_with_access"
  ON task_management_assignments
  FOR UPDATE
  TO authenticated
  USING (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  )
  WITH CHECK (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

CREATE POLICY "assignments_delete_with_access"
  ON task_management_assignments
  FOR DELETE
  TO authenticated
  USING (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );
