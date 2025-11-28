/*
  # Add Super Admin Permission to View All Users

  ## Changes
  - Add policy for super_admin to view all user profiles
  - Add policy for admins to view users in their projects
  - Use app_metadata to store role to avoid recursive queries
*/

-- First, let's update the auth.users metadata to include role
DO $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb((SELECT role FROM user_profiles WHERE user_profiles.id = auth.users.id))
  )
  WHERE id IN (SELECT id FROM user_profiles);
END $$;

-- Create function to sync role to auth metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep auth metadata in sync
DROP TRIGGER IF EXISTS sync_role_to_auth ON user_profiles;
CREATE TRIGGER sync_role_to_auth
  AFTER INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_auth();

-- Add policies using JWT claims
CREATE POLICY "Super admin can view all users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'super_admin'
  );

CREATE POLICY "Admins can view users in their projects"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin' AND
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_users pu ON pu.project_id = p.id
      WHERE p.admin_id = auth.uid() AND pu.user_id = user_profiles.id
    )
  );

-- Update policies for super admin
CREATE POLICY "Super admin can update all users"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'super_admin');
