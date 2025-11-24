import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  admin_id: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  project_id: string;
  name: string;
  tax_number: string;
  address: string;
  phone: string;
  email: string;
  company_category: 'employer' | 'contractor' | 'subcontractor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Personnel {
  id: string;
  project_id: string;
  company_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  position: string;
  phone: string;
  email: string;
  dashboard_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  key: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ModulePermission {
  id: string;
  project_id: string;
  user_id: string;
  module_id: string;
  can_read: boolean;
  can_write: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  task_type: string;
  target_count: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserTask {
  id: string;
  task_id: string;
  user_id: string;
  completed_count: number;
  success_rate: number | null;
  status: 'active' | 'completed' | 'expired';
  assigned_at: string;
  completed_at: string | null;
}

export interface Nonconformity {
  id: string;
  project_id: string;
  company_id: string;
  personnel_id: string;
  title: string;
  description: string;
  location: string;
  status: 'open' | 'in_review' | 'closed';
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskManagementSettings {
  id: string;
  project_id: string;
  number_prefix: string;
  current_number: number;
  created_at: string;
  updated_at: string;
}

export interface TaskManagementTask {
  id: string;
  project_id: string;
  task_number: string;
  title: string;
  description: string | null;
  company_id: string | null;
  task_owner_id: string;
  status: 'open' | 'in_progress' | 'pending_approval' | 'closed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  task_category: string | null;
  target_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closing_notes: string | null;
}

export interface TaskManagementAssignment {
  id: string;
  task_id: string;
  personnel_id: string;
  role: 'owner' | 'responsible';
  assigned_at: string;
  assigned_by: string;
}

export interface TaskManagementComment {
  id: string;
  task_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export interface TaskManagementNotification {
  id: string;
  task_id: string;
  user_id: string;
  comment_id: string | null;
  notification_type: 'comment' | 'status_change' | 'assignment' | 'mention';
  is_read: boolean;
  created_at: string;
}

export interface TaskManagementHistory {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface TaskManagementCategory {
  id: string;
  project_id: string;
  category_name: string;
  created_at: string;
  created_by: string;
}

export interface TaskManagementWorkLog {
  id: string;
  task_id: string;
  personnel_id: string;
  log_description: string;
  created_at: string;
}

export interface TaskManagementWorkLogPhoto {
  id: string;
  work_log_id: string;
  photo_url: string;
  uploaded_at: string;
}

export interface TaskManagementTaskPhoto {
  id: string;
  task_id: string;
  photo_url: string;
  uploaded_by: string;
  uploaded_at: string;
}
