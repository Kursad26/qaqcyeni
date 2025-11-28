/*
  # Auto Confirm User Emails

  ## Description
  This migration updates the trigger to automatically confirm user emails
  upon signup, eliminating the need for email verification.

  ## Changes
  - Update handle_new_user function to set email_confirmed_at
  - All new users will have their emails automatically confirmed
*/

-- Update function to auto-confirm emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    true
  );
  
  -- Auto-confirm email
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
