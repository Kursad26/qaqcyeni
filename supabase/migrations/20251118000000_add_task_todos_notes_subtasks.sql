-- Task Management: TODO, Notes, Subtasks, Files İyileştirmeleri
-- Tarih: 2025-11-18

-- ============================================
-- 1. TODO LİSTESİ TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS task_management_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES task_management_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,

  -- Oluşturan kişi
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_by_name TEXT NOT NULL,

  -- Tamamlayan kişi
  completed_by UUID REFERENCES auth.users(id),
  completed_by_name TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_task_todos_task_id ON task_management_todos(task_id);
CREATE INDEX idx_task_todos_order ON task_management_todos(task_id, display_order);

-- ============================================
-- 2. NOTLAR TABLOSU (Notion-style)
-- ============================================
CREATE TABLE IF NOT EXISTS task_management_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES task_management_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type VARCHAR(20) DEFAULT 'text' CHECK (note_type IN ('text', 'bullet', 'heading')),
  display_order INTEGER DEFAULT 0,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_by_name TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_task_notes_task_id ON task_management_notes(task_id);
CREATE INDEX idx_task_notes_order ON task_management_notes(task_id, display_order);

-- ============================================
-- 3. ALT GÖREVLER TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS task_management_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES task_management_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  assigned_to UUID REFERENCES personnel(id),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  display_order INTEGER DEFAULT 0,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_task_subtasks_parent ON task_management_subtasks(parent_task_id);
CREATE INDEX idx_task_subtasks_order ON task_management_subtasks(parent_task_id, display_order);

-- ============================================
-- 4. ÇALIŞMA KAYDI DOSYALARI TABLOSU (PDF, vb.)
-- ============================================
CREATE TABLE IF NOT EXISTS task_management_work_log_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES task_management_work_logs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  file_type VARCHAR(50) NOT NULL, -- 'application/pdf', etc.

  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_work_log_files_log_id ON task_management_work_log_files(work_log_id);

-- ============================================
-- 5. RLS POLİCİES
-- ============================================

-- TODO Policies
ALTER TABLE task_management_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes task'a erişimi olanlar TODO'ları görebilir"
  ON task_management_todos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes TODO ekleyebilir"
  ON task_management_todos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes TODO güncelleyebilir"
  ON task_management_todos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "TODO silebilir (oluşturan veya admin)"
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
ALTER TABLE task_management_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes task'a erişimi olanlar notları görebilir"
  ON task_management_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes not ekleyebilir"
  ON task_management_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes not güncelleyebilir"
  ON task_management_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Not silebilir (oluşturan veya admin)"
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
ALTER TABLE task_management_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes task'a erişimi olanlar alt görevleri görebilir"
  ON task_management_subtasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = parent_task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes alt görev ekleyebilir"
  ON task_management_subtasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = parent_task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes alt görev güncelleyebilir"
  ON task_management_subtasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM task_management_tasks t
      WHERE t.id = parent_task_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Alt görev silebilir (oluşturan veya admin)"
  ON task_management_subtasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Work Log Files Policies
ALTER TABLE task_management_work_log_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes dosyaları görebilir"
  ON task_management_work_log_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_management_work_logs wl
      JOIN task_management_tasks t ON t.id = wl.task_id
      WHERE wl.id = work_log_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Herkes dosya yükleyebilir"
  ON task_management_work_log_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_management_work_logs wl
      JOIN task_management_tasks t ON t.id = wl.task_id
      WHERE wl.id = work_log_id
      AND t.project_id IN (
        SELECT project_id FROM personnel WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Dosya silebilir (yükleyen veya admin)"
  ON task_management_work_log_files FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 6. UPDATED_AT TRİGGERLARI
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_todos_updated_at
  BEFORE UPDATE ON task_management_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_notes_updated_at
  BEFORE UPDATE ON task_management_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_subtasks_updated_at
  BEFORE UPDATE ON task_management_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
