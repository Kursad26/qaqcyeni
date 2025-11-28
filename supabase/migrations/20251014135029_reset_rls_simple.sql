/*
  # Reset RLS Policies - Simple Approach

  ## Problem
  Multiple conflicting policies causing 500 errors

  ## Solution
  Remove ALL policies and create single comprehensive policies
*/

-- Disable RLS temporarily to clean up
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow users to view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can view all users" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view users in their projects" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can update all users" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create single simple SELECT policy
CREATE POLICY "user_profiles_select_policy"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Create single simple UPDATE policy
CREATE POLICY "user_profiles_update_policy"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create single simple INSERT policy
CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);
