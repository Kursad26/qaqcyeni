/*
  # Initial Database Schema for Construction Quality Control Management System

  ## Overview
  This migration creates the foundational database structure for a comprehensive construction quality control management application with hierarchical user permissions.

  ## 1. New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email address
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'super_admin', 'admin', 'user'
  - `is_active` (boolean) - Active/inactive status
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `projects`
  - `id` (uuid, primary key)
  - `name` (text) - Project name
  - `description` (text) - Project description
  - `location` (text) - Project location
  - `admin_id` (uuid) - References user_profiles (one admin per project)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `project_users`
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `user_id` (uuid) - References user_profiles
  - `added_at` (timestamptz)
  - Unique constraint on (project_id, user_id)

  ### `companies`
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `name` (text) - Company name
  - `tax_number` (text) - Tax identification number
  - `address` (text) - Company address
  - `phone` (text) - Contact phone
  - `email` (text) - Contact email
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `personnel`
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `company_id` (uuid) - References companies
  - `user_id` (uuid, nullable) - References user_profiles (if personnel is also a system user)
  - `first_name` (text) - First name
  - `last_name` (text) - Last name
  - `position` (text) - Job position/title
  - `phone` (text) - Contact phone
  - `email` (text) - Contact email
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `modules`
  - `id` (uuid, primary key)
  - `key` (text, unique) - Unique module identifier
  - `name` (text) - Module display name
  - `description` (text) - Module description
  - `is_active` (boolean) - Module active status
  - `created_at` (timestamptz)

  ### `module_permissions`
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `user_id` (uuid) - References user_profiles
  - `module_id` (uuid) - References modules
  - `can_read` (boolean) - Read permission
  - `can_write` (boolean) - Write permission
  - `can_update` (boolean) - Update permission
  - `can_delete` (boolean) - Delete permission
  - `created_at` (timestamptz)
  - Unique constraint on (project_id, user_id, module_id)

  ### `tasks`
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `title` (text) - Task title
  - `description` (text) - Task description
  - `task_type` (text) - Type: 'training', 'nonconformity', etc.
  - `target_count` (integer) - Target number to complete
  - `start_date` (date) - Task start date
  - `end_date` (date) - Task end date
  - `created_by` (uuid) - References user_profiles
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `user_tasks`
  - `id` (uuid, primary key)
  - `task_id` (uuid) - References tasks
  - `user_id` (uuid) - References user_profiles
  - `completed_count` (integer) - Current completion count
  - `success_rate` (numeric) - Final success rate (calculated when task ends)
  - `status` (text) - Status: 'active', 'completed', 'expired'
  - `assigned_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)
  - Unique constraint on (task_id, user_id)

  ### `nonconformities`
  - `id` (uuid, primary key)
  - `project_id` (uuid) - References projects
  - `company_id` (uuid) - References companies
  - `personnel_id` (uuid) - References personnel
  - `title` (text) - Nonconformity title
  - `description` (text) - Detailed description
  - `location` (text) - Location where found
  - `status` (text) - Status: 'open', 'in_review', 'closed'
  - `opened_by` (uuid) - References user_profiles
  - `opened_at` (timestamptz)
  - `closed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security

  - Enable Row Level Security (RLS) on all tables
  - Super admin has full access to all data
  - Admins have full access to their own projects
  - Users can only access data from projects they're assigned to
  - Inactive users have no access to any data
  - Module permissions control feature-level access

  ## 3. Important Notes

  - Super admin user will be created via a separate process after migration
  - All tables use UUID for primary keys with automatic generation
  - Timestamps use timestamptz for timezone awareness
  - Foreign key constraints ensure referential integrity
  - Unique constraints prevent duplicate relationships
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  admin_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_users table
CREATE TABLE IF NOT EXISTS project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  tax_number text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create personnel table
CREATE TABLE IF NOT EXISTS personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  position text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create module_permissions table
CREATE TABLE IF NOT EXISTS module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id, module_id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  task_type text NOT NULL,
  target_count integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_tasks table
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  completed_count integer DEFAULT 0,
  success_rate numeric(5,2),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(task_id, user_id)
);

-- Create nonconformities table
CREATE TABLE IF NOT EXISTS nonconformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  location text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'closed')),
  opened_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonconformities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Super admin can view all user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND is_active = true);

CREATE POLICY "Admins can view users in their projects"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN projects p ON p.admin_id = up.id
      JOIN project_users pu ON pu.project_id = p.id
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.is_active = true AND pu.user_id = user_profiles.id
    )
  );

CREATE POLICY "Super admin can update any user profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND is_active = true)
  WITH CHECK (id = auth.uid() AND is_active = true);

-- RLS Policies for projects
CREATE POLICY "Super admin can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Admins can view their own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Users can view projects they are assigned to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      JOIN user_profiles up ON up.id = pu.user_id
      WHERE pu.project_id = projects.id AND pu.user_id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin') AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can update any project"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Admins can update their own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  )
  WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can delete any project"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Admins can delete their own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

-- RLS Policies for project_users
CREATE POLICY "Super admin can view all project users"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Admins can view their project users"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE p.id = project_users.project_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Users can view their own project assignments"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can manage all project users"
  ON project_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Admins can manage users in their projects"
  ON project_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE p.id = project_users.project_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE p.id = project_users.project_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  );

-- RLS Policies for companies (simplified - project-based access)
CREATE POLICY "Project members can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = companies.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM project_users pu WHERE pu.project_id = companies.project_id AND pu.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Admins and super admin can manage companies"
  ON companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = companies.project_id AND p.admin_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = companies.project_id AND p.admin_id = auth.uid())
      )
    )
  );

-- RLS Policies for personnel (similar to companies)
CREATE POLICY "Project members can view personnel"
  ON personnel FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = personnel.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM project_users pu WHERE pu.project_id = personnel.project_id AND pu.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Admins and super admin can manage personnel"
  ON personnel FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = personnel.project_id AND p.admin_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = personnel.project_id AND p.admin_id = auth.uid())
      )
    )
  );

-- RLS Policies for modules
CREATE POLICY "Authenticated users can view active modules"
  ON modules FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can manage modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

-- RLS Policies for module_permissions
CREATE POLICY "Users can view their own module permissions"
  ON module_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Admins can view permissions in their projects"
  ON module_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE p.id = module_permissions.project_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can view all permissions"
  ON module_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Admins can manage permissions in their projects"
  ON module_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE p.id = module_permissions.project_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE p.id = module_permissions.project_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can manage all permissions"
  ON module_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Project members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM project_users pu WHERE pu.project_id = tasks.project_id AND pu.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Admins and super admin can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND p.admin_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND p.admin_id = auth.uid())
      )
    )
  );

-- RLS Policies for user_tasks
CREATE POLICY "Users can view their own tasks"
  ON user_tasks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Admins can view tasks in their projects"
  ON user_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE t.id = user_tasks.task_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can view all user tasks"
  ON user_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

CREATE POLICY "Users can update their own task progress"
  ON user_tasks FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Admins can manage user tasks in their projects"
  ON user_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE t.id = user_tasks.task_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN user_profiles up ON up.id = p.admin_id
      WHERE t.id = user_tasks.task_id AND p.admin_id = auth.uid() AND up.is_active = true
    )
  );

CREATE POLICY "Super admin can manage all user tasks"
  ON user_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

-- RLS Policies for nonconformities
CREATE POLICY "Project members can view nonconformities"
  ON nonconformities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = nonconformities.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM project_users pu WHERE pu.project_id = nonconformities.project_id AND pu.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Authorized users can create nonconformities"
  ON nonconformities FOR INSERT
  TO authenticated
  WITH CHECK (
    opened_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role IN ('admin', 'super_admin') OR
        EXISTS (
          SELECT 1 FROM module_permissions mp
          JOIN modules m ON m.id = mp.module_id
          WHERE mp.user_id = auth.uid() AND mp.project_id = nonconformities.project_id 
          AND m.key = 'nonconformities' AND mp.can_write = true
        )
      )
    )
  );

CREATE POLICY "Authorized users can update nonconformities"
  ON nonconformities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = nonconformities.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM module_permissions mp
          JOIN modules m ON m.id = mp.module_id
          WHERE mp.user_id = auth.uid() AND mp.project_id = nonconformities.project_id 
          AND m.key = 'nonconformities' AND mp.can_update = true
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = nonconformities.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM module_permissions mp
          JOIN modules m ON m.id = mp.module_id
          WHERE mp.user_id = auth.uid() AND mp.project_id = nonconformities.project_id 
          AND m.key = 'nonconformities' AND mp.can_update = true
        )
      )
    )
  );

CREATE POLICY "Authorized users can delete nonconformities"
  ON nonconformities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = true AND (
        up.role = 'super_admin' OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = nonconformities.project_id AND p.admin_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM module_permissions mp
          JOIN modules m ON m.id = mp.module_id
          WHERE mp.user_id = auth.uid() AND mp.project_id = nonconformities.project_id 
          AND m.key = 'nonconformities' AND mp.can_delete = true
        )
      )
    )
  );

-- Insert default modules
INSERT INTO modules (key, name, description, is_active) VALUES
  ('nonconformities', 'Uygunsuzluk Takibi', 'Uygunsuzluk raporları oluşturma ve takip etme', true),
  ('noi', 'NOI Yönetimi', 'Notice of Inspection yönetimi', true),
  ('material_approval', 'Malzeme Onay', 'Malzeme onay süreçleri', true),
  ('material_control', 'Malzeme Kontrol', 'Malzeme kontrol işlemleri', true),
  ('calibration', 'Kalibrasyon', 'Kalibrasyon kayıtları ve takibi', true),
  ('training', 'Eğitimler', 'Saha eğitimleri ve kayıtları', true)
ON CONFLICT (key) DO NOTHING;

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON personnel FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON nonconformities FOR EACH ROW EXECUTE FUNCTION handle_updated_at();