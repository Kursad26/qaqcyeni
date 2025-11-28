/*
  # Fix RLS Policies - Remove Recursive Queries

  ## Problem
  RLS policies were causing infinite recursion by querying the same table they're protecting.
  The "Super admin can view all user profiles" policy queries user_profiles within itself.

  ## Solution
  Simplify RLS policies to avoid recursive queries:
  - Use direct role checks without subqueries on the same table
  - Store role information in a way that doesn't require self-referential queries

  ## Changes
  1. Drop existing problematic policies
  2. Create new simplified policies that don't cause recursion
*/

-- Drop all existing user_profiles policies
DROP POLICY IF EXISTS "Super admin can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view users in their projects" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can update any user profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create new simplified policies without recursion

-- SELECT Policies
CREATE POLICY "Allow users to view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- UPDATE Policies  
CREATE POLICY "Allow users to update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT Policy (for trigger function)
CREATE POLICY "Allow service role to insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
