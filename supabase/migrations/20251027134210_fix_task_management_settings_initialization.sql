/*
  # Fix Task Management Settings Initialization
  
  1. Purpose
    - Ensure all projects have task_management_settings initialized
    - Set default values for projects without settings
  
  2. Changes
    - Insert default settings for projects that don't have settings yet
    - Uses ON CONFLICT to avoid duplicates
  
  3. Security
    - No RLS changes, only data initialization
*/

-- Insert default task_management_settings for projects that don't have it yet
INSERT INTO task_management_settings (project_id, number_prefix, current_number, last_task_number)
SELECT 
  p.id as project_id,
  'TSK' as number_prefix,
  0 as current_number,
  0 as last_task_number
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 
  FROM task_management_settings tms 
  WHERE tms.project_id = p.id
)
ON CONFLICT (project_id) DO NOTHING;
