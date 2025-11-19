# Super Admin Setup Instructions

To create the super admin account with email `kursadgundogan@gmail.com` and password `123456`, please follow these steps:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://fuiyywylsairtoiimvvr.supabase.co
2. Navigate to **Authentication** > **Users**
3. Click **Add User** > **Create new user**
4. Enter:
   - Email: `kursadgundogan@gmail.com`
   - Password: `123456`
   - Confirm Password: `123456`
5. Click **Create user**
6. The user profile will be automatically created via database trigger
7. Now update the user role to super_admin:
   - Go to **SQL Editor**
   - Run this query:

```sql
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'kursadgundogan@gmail.com';
```

## Option 2: Using SQL Editor Directly

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Note: You'll need to replace the encrypted password with actual auth.users insert
-- It's easier to use Option 1 above
```

## Verification

After creating the super admin, you can verify by running:

```sql
SELECT id, email, role, is_active FROM user_profiles WHERE email = 'kursadgundogan@gmail.com';
```

You should see:
- email: `kursadgundogan@gmail.com`
- role: `super_admin`
- is_active: `true`

## Login

Now you can login to the application at:
- Email: `kursadgundogan@gmail.com`
- Password: `123456`

You will have full access to:
- User Management (promote users to admin)
- All projects
- All system features
