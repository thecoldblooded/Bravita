-- Add RLS policies for profiles table to fix access issues

-- Drop existing policies if they conflict (though none were found for SELECT/UPDATE except INSERT)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 1. Users can view their own profile
-- This is critical for is_admin_user() to work (since it checks the user's own profile)
-- and for the frontend to show profile data.
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Admins can view all profiles
-- This allows admins to see customer names on the dashboard.
-- Reliance on "Users can view own profile" breaks potential recursion for is_admin_user().
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true 
  OR 
  (SELECT is_superadmin FROM profiles WHERE id = auth.uid()) = true
);

-- Note: We inline the check instead of calling is_admin_user() just to be safe and explicit about the subquery,
-- though is_admin_user() does effectively the same thing. 
-- The recursion is broken because the subquery (WHERE id = auth.uid()) 
-- is permitted by "Users can view own profile".
