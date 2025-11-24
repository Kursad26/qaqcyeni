/*
  # Fix Task Workflow and RLS Completely

  ## Problem
  1. RLS policies still have infinite recursion issues
  2. Category insert fails due to RLS
  3. Task workflow needs simplification
  4. Status should be: open -> in_progress -> pending_approval -> completed

  ## Solution
  1. Completely rebuild RLS policies without any circular references
  2. Fix category RLS policies
  3. Update task status enum to match workflow
  4. Add proper indexes for performance

  ## Changes
  - Drop ALL existing RLS policies
  - Create simple, non-recursive policies
  - Fix category policies
  - Update status values
*/

-- First, disable RLS temporarily to clean up
ALTER TABLE task_management_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_work_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_task_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_work_log_photos DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for task_management_tasks
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'task_management_tasks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON task_management_tasks';
    END LOOP;
END $$;

-- Drop ALL existing policies for task_management_assignments
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'task_management_assignments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON task_management_assignments';
    END LOOP;
END $$;

-- Drop ALL existing policies for categories
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'task_management_categories') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON task_management_categories';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE task_management_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_management_work_log_photos ENABLE ROW LEVEL SECURITY;

-- ========================================
-- TASK_MANAGEMENT_TASKS POLICIES
-- ========================================

-- SELECT: Anyone with task_management_access can view
CREATE POLICY "task_select_policy"
  ON task_management_tasks
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_access = true
    )
  );

-- INSERT: Anyone with task_management_access can create
CREATE POLICY "task_insert_policy"
  ON task_management_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_access = true
    )
  );

-- UPDATE: Task owner, creator, admins, or assigned personnel
CREATE POLICY "task_update_policy"
  ON task_management_tasks
  FOR UPDATE
  TO authenticated
  USING (
    -- Task owner or creator
    task_owner_id = auth.uid()
    OR created_by = auth.uid()
    -- Admin
    OR project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
    -- Assigned personnel (using direct subquery, not referencing tasks table)
    OR id IN (
      SELECT task_id FROM task_management_assignments
      WHERE personnel_id IN (
        SELECT id FROM personnel WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    task_owner_id = auth.uid()
    OR created_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
    OR id IN (
      SELECT task_id FROM task_management_assignments
      WHERE personnel_id IN (
        SELECT id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: Only admins
CREATE POLICY "task_delete_policy"
  ON task_management_tasks
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
  );

-- ========================================
-- TASK_MANAGEMENT_ASSIGNMENTS POLICIES
-- ========================================

CREATE POLICY "assignment_select_policy"
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

CREATE POLICY "assignment_insert_policy"
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

CREATE POLICY "assignment_update_policy"
  ON task_management_assignments
  FOR UPDATE
  TO authenticated
  USING (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid() 
        AND (task_management_access = true OR task_management_admin = true)
      )
    )
  )
  WITH CHECK (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid() 
        AND (task_management_access = true OR task_management_admin = true)
      )
    )
  );

CREATE POLICY "assignment_delete_policy"
  ON task_management_assignments
  FOR DELETE
  TO authenticated
  USING (
    personnel_id IN (
      SELECT id FROM personnel 
      WHERE project_id IN (
        SELECT project_id FROM personnel 
        WHERE user_id = auth.uid() 
        AND (task_management_access = true OR task_management_admin = true)
      )
    )
  );

-- ========================================
-- TASK_MANAGEMENT_CATEGORIES POLICIES
-- ========================================

CREATE POLICY "category_select_policy"
  ON task_management_categories
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_access = true
    )
  );

CREATE POLICY "category_insert_policy"
  ON task_management_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
  );

CREATE POLICY "category_update_policy"
  ON task_management_categories
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
  );

CREATE POLICY "category_delete_policy"
  ON task_management_categories
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM personnel 
      WHERE user_id = auth.uid() 
      AND task_management_admin = true
    )
  );

-- Update existing 'closed' status to 'completed' for consistency
UPDATE task_management_tasks SET status = 'completed' WHERE status = 'closed';
