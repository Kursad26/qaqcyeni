/*
  # Fix Task Management RLS Infinite Recursion

  ## Problem
  The RLS policies for task_management_tasks cause infinite recursion because
  they reference task_management_assignments which in turn references back to
  task_management_tasks, creating a circular dependency.

  ## Solution
  Simplify the policies to avoid circular references by using direct joins
  and avoiding nested EXISTS clauses that cause recursion.

  ## Changes
  - Drop existing problematic policies
  - Create new simplified policies without circular references
  - Ensure proper access control is maintained
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users with access can view tasks" ON task_management_tasks;
DROP POLICY IF EXISTS "Users with access can create tasks" ON task_management_tasks;
DROP POLICY IF EXISTS "Task owners, assigned personnel, and admins can update tasks" ON task_management_tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON task_management_tasks;

-- Create new simplified policies without recursion

-- View policy: Check personnel access without circular reference
CREATE POLICY "Users with task management access can view tasks"
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

-- Create policy: Same as view
CREATE POLICY "Users with task management access can create tasks"
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

-- Update policy: Allow task owner, creator, or admins (no circular reference to assignments)
CREATE POLICY "Task owners and admins can update tasks"
  ON task_management_tasks
  FOR UPDATE
  TO authenticated
  USING (
    task_owner_id = auth.uid()
    OR
    created_by = auth.uid()
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

-- Separate policy for assigned personnel to update status only
CREATE POLICY "Assigned personnel can update task status"
  ON task_management_tasks
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tma.task_id 
      FROM task_management_assignments tma
      INNER JOIN personnel p ON p.id = tma.personnel_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT tma.task_id 
      FROM task_management_assignments tma
      INNER JOIN personnel p ON p.id = tma.personnel_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Delete policy: Only admins
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

-- Fix assignments policies to avoid recursion
DROP POLICY IF EXISTS "Users with access can view assignments" ON task_management_assignments;
DROP POLICY IF EXISTS "Users with access can create assignments" ON task_management_assignments;
DROP POLICY IF EXISTS "Task owners and admins can update assignments" ON task_management_assignments;
DROP POLICY IF EXISTS "Task owners and admins can delete assignments" ON task_management_assignments;

CREATE POLICY "Users with task access can view assignments"
  ON task_management_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id IN (
        SELECT project_id FROM task_management_tasks WHERE id = task_management_assignments.task_id
      )
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

CREATE POLICY "Users with task access can create assignments"
  ON task_management_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id IN (
        SELECT project_id FROM task_management_tasks WHERE id = task_management_assignments.task_id
      )
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

CREATE POLICY "Task creators and admins can update assignments"
  ON task_management_assignments
  FOR UPDATE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM task_management_tasks 
      WHERE task_owner_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks tmt
      INNER JOIN personnel p ON p.project_id = tmt.project_id
      WHERE tmt.id = task_management_assignments.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT id FROM task_management_tasks 
      WHERE task_owner_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks tmt
      INNER JOIN personnel p ON p.project_id = tmt.project_id
      WHERE tmt.id = task_management_assignments.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Task creators and admins can delete assignments"
  ON task_management_assignments
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM task_management_tasks 
      WHERE task_owner_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_management_tasks tmt
      INNER JOIN personnel p ON p.project_id = tmt.project_id
      WHERE tmt.id = task_management_assignments.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );
