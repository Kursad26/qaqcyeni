-- Fix RLS Policies for task_management_todos, notes, and subtasks
-- Add task_management_access check and admin access
-- Date: 2025-11-19

-- ============================================
-- 1. DROP OLD POLICIES
-- ============================================

-- Drop old TODO policies
DROP POLICY IF EXISTS "Herkes task'a erişimi olanlar TODO'ları görebilir" ON task_management_todos;
DROP POLICY IF EXISTS "Herkes TODO ekleyebilir" ON task_management_todos;
DROP POLICY IF EXISTS "Herkes TODO güncelleyebilir" ON task_management_todos;
DROP POLICY IF EXISTS "TODO silebilir (oluşturan veya admin)" ON task_management_todos;

-- Drop old Notes policies
DROP POLICY IF EXISTS "Herkes task'a erişimi olanlar notları görebilir" ON task_management_notes;
DROP POLICY IF EXISTS "Herkes not ekleyebilir" ON task_management_notes;
DROP POLICY IF EXISTS "Herkes not güncelleyebilir" ON task_management_notes;
DROP POLICY IF EXISTS "Not silebilir (oluşturan veya admin)" ON task_management_notes;

-- Drop old Subtasks policies
DROP POLICY IF EXISTS "Herkes task'a erişimi olanlar alt görevleri görebilir" ON task_management_subtasks;
DROP POLICY IF EXISTS "Herkes alt görev ekleyebilir" ON task_management_subtasks;
DROP POLICY IF EXISTS "Herkes alt görev güncelleyebilir" ON task_management_subtasks;
DROP POLICY IF EXISTS "Alt görev silebilir (oluşturan veya admin)" ON task_management_subtasks;

-- ============================================
-- 2. CREATE NEW POLICIES WITH ACCESS CHECKS
-- ============================================

-- TODO Policies
CREATE POLICY "Users with task access can view todos"
  ON task_management_todos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_management_todos.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with task access can create todos"
  ON task_management_todos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with task access can update todos"
  ON task_management_todos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_management_todos.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Todo creators and admins can delete todos"
  ON task_management_todos FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Notes Policies
CREATE POLICY "Users with task access can view notes"
  ON task_management_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_management_notes.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with task access can create notes"
  ON task_management_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with task access can update notes"
  ON task_management_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_management_notes.task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Note creators and admins can delete notes"
  ON task_management_notes FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Subtasks Policies
CREATE POLICY "Users with task access can view subtasks"
  ON task_management_subtasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_management_subtasks.parent_task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with task access can create subtasks"
  ON task_management_subtasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = parent_task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users with task access can update subtasks"
  ON task_management_subtasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      INNER JOIN personnel p ON p.project_id = t.project_id
      WHERE t.id = task_management_subtasks.parent_task_id
      AND p.user_id = auth.uid()
      AND p.task_management_access = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Subtask creators and admins can delete subtasks"
  ON task_management_subtasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
