/*
  # Add Auth Trigger for User Profiles

  ## Description
  This migration creates a trigger that automatically creates a user_profile
  entry whenever a new user signs up via Supabase Auth. This ensures
  every authenticated user has a corresponding profile.

  ## Changes
  - Create function to handle new user signup
  - Create trigger on auth.users table
  - Automatically creates user_profile with 'user' role by default
  - Extracts full name from user metadata if available
*/

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
