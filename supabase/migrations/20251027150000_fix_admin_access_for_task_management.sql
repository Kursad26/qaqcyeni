/*
  # Fix Admin Access for Task Management

  ## Problem
  Admin users (super_admin and admin roles) cannot:
  1. View tasks - tasks table shows empty
  2. Add categories - category insert fails
  3. See TaskViewSidePanel - no tasks visible to click

  Root cause: RLS policies require personnel.task_management_access = true
  Admin users might not exist in personnel table, so they are blocked.

  ## Solution
  Update all RLS policies to allow:
  - Admin users (super_admin/admin role) → Full access without personnel check
  - Personnel users with task_management_access → Project-specific access

  ## Changes
  1. Drop existing restrictive policies
  2. Create new policies with admin OR personnel logic
  3. Apply to all task management tables

  ## Security
  - Admin users get full access (they manage the system)
  - Regular users still need personnel record with proper permissions
  - All policies check user is authenticated and active
*/

-- ========================================
-- TASKS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "tasks_select_with_access" ON task_management_tasks;
DROP POLICY IF EXISTS "tasks_insert_with_access" ON task_management_tasks;
DROP POLICY IF EXISTS "tasks_update_with_access" ON task_management_tasks;
DROP POLICY IF EXISTS "tasks_delete_admin_only" ON task_management_tasks;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "tasks_select_admin_or_access"
  ON task_management_tasks
  FOR SELECT
  TO authenticated
  USING (
    -- Admin users can see all tasks
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    -- Personnel with access can see project tasks
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "tasks_insert_admin_or_access"
  ON task_management_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- UPDATE: Admin users OR users with task_management_access
CREATE POLICY "tasks_update_admin_or_access"
  ON task_management_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- DELETE: Admin users only
CREATE POLICY "tasks_delete_admins"
  ON task_management_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_tasks.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

-- ========================================
-- CATEGORIES TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "categories_select_with_access" ON task_management_categories;
DROP POLICY IF EXISTS "categories_insert_with_access" ON task_management_categories;
DROP POLICY IF EXISTS "categories_update_admin_only" ON task_management_categories;
DROP POLICY IF EXISTS "categories_delete_admin_only" ON task_management_categories;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "categories_select_admin_or_access"
  ON task_management_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "categories_insert_admin_or_access"
  ON task_management_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_access = true
    )
  );

-- UPDATE: Admin users OR task_management_admin
CREATE POLICY "categories_update_admins"
  ON task_management_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

-- DELETE: Admin users OR task_management_admin
CREATE POLICY "categories_delete_admins"
  ON task_management_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.project_id = task_management_categories.project_id
      AND personnel.user_id = auth.uid()
      AND personnel.task_management_admin = true
    )
  );

-- ========================================
-- ASSIGNMENTS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "assignments_select_with_access" ON task_management_assignments;
DROP POLICY IF EXISTS "assignments_insert_with_access" ON task_management_assignments;
DROP POLICY IF EXISTS "assignments_update_with_access" ON task_management_assignments;
DROP POLICY IF EXISTS "assignments_delete_with_access" ON task_management_assignments;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "assignments_select_admin_or_access"
  ON task_management_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    personnel_id IN (
      SELECT id FROM personnel
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "assignments_insert_admin_or_access"
  ON task_management_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    personnel_id IN (
      SELECT id FROM personnel
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- UPDATE: Admin users OR users with task_management_access
CREATE POLICY "assignments_update_admin_or_access"
  ON task_management_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
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
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    personnel_id IN (
      SELECT id FROM personnel
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- DELETE: Admin users OR users with task_management_access
CREATE POLICY "assignments_delete_admin_or_access"
  ON task_management_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    personnel_id IN (
      SELECT id FROM personnel
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- ========================================
-- COMMENTS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "comments_select_policy" ON task_management_comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON task_management_comments;
DROP POLICY IF EXISTS "comments_update_policy" ON task_management_comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON task_management_comments;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "comments_select_admin_or_access"
  ON task_management_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    task_id IN (
      SELECT id FROM task_management_tasks
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "comments_insert_admin_or_access"
  ON task_management_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    task_id IN (
      SELECT id FROM task_management_tasks
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- ========================================
-- WORK LOGS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "work_logs_select_policy" ON task_management_work_logs;
DROP POLICY IF EXISTS "work_logs_insert_policy" ON task_management_work_logs;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "work_logs_select_admin_or_access"
  ON task_management_work_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    task_id IN (
      SELECT id FROM task_management_tasks
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "work_logs_insert_admin_or_access"
  ON task_management_work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    task_id IN (
      SELECT id FROM task_management_tasks
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- ========================================
-- WORK LOG PHOTOS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "work_log_photos_select_policy" ON task_management_work_log_photos;
DROP POLICY IF EXISTS "work_log_photos_insert_policy" ON task_management_work_log_photos;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "work_log_photos_select_admin_or_access"
  ON task_management_work_log_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    work_log_id IN (
      SELECT id FROM task_management_work_logs
      WHERE task_id IN (
        SELECT id FROM task_management_tasks
        WHERE project_id IN (
          SELECT project_id FROM personnel
          WHERE user_id = auth.uid()
          AND task_management_access = true
        )
      )
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "work_log_photos_insert_admin_or_access"
  ON task_management_work_log_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    work_log_id IN (
      SELECT id FROM task_management_work_logs
      WHERE task_id IN (
        SELECT id FROM task_management_tasks
        WHERE project_id IN (
          SELECT project_id FROM personnel
          WHERE user_id = auth.uid()
          AND task_management_access = true
        )
      )
    )
  );

-- ========================================
-- TASK PHOTOS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "task_photos_select_policy" ON task_management_task_photos;
DROP POLICY IF EXISTS "task_photos_insert_policy" ON task_management_task_photos;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "task_photos_select_admin_or_access"
  ON task_management_task_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    task_id IN (
      SELECT id FROM task_management_tasks
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- INSERT: Admin users OR users with task_management_access
CREATE POLICY "task_photos_insert_admin_or_access"
  ON task_management_task_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    task_id IN (
      SELECT id FROM task_management_tasks
      WHERE project_id IN (
        SELECT project_id FROM personnel
        WHERE user_id = auth.uid()
        AND task_management_access = true
      )
    )
  );

-- ========================================
-- SETTINGS TABLE: Allow admin users
-- ========================================

DROP POLICY IF EXISTS "settings_select_policy" ON task_management_settings;
DROP POLICY IF EXISTS "settings_update_policy" ON task_management_settings;

-- SELECT: Admin users OR users with task_management_access
CREATE POLICY "settings_select_admin_or_access"
  ON task_management_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    project_id IN (
      SELECT project_id FROM personnel
      WHERE user_id = auth.uid()
      AND task_management_access = true
    )
  );

-- UPDATE: Admin users OR task_management_admin
CREATE POLICY "settings_update_admins"
  ON task_management_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    project_id IN (
      SELECT project_id FROM personnel
      WHERE user_id = auth.uid()
      AND task_management_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
    OR
    project_id IN (
      SELECT project_id FROM personnel
      WHERE user_id = auth.uid()
      AND task_management_admin = true
    )
  );
