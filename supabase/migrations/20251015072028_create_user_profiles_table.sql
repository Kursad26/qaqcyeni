/*
  # Create User Profiles Table

  ## Description
  This migration creates the user_profiles table which extends Supabase auth.users
  with custom profile data including roles and activity status.

  ## Tables Created
  - `user_profiles`
    - `id` (uuid, primary key) - Links to auth.users
    - `email` (text, unique, not null) - User's email address
    - `full_name` (text, not null) - User's full name
    - `role` (text, not null, default 'user') - User role: super_admin, admin, or user
    - `is_active` (boolean, not null, default true) - Whether user account is active
    - `created_at` (timestamptz, not null, default now()) - Account creation timestamp
    - `updated_at` (timestamptz, not null, default now()) - Last update timestamp

  ## Security
  - RLS enabled on user_profiles table
  - Simple policies allowing authenticated users full access
  - Application-level role checks handle authorization
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users
CREATE POLICY "user_profiles_select_policy" 
  ON user_profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "user_profiles_insert_policy" 
  ON user_profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "user_profiles_update_policy" 
  ON user_profiles FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "user_profiles_delete_policy" 
  ON user_profiles FOR DELETE 
  TO authenticated 
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
