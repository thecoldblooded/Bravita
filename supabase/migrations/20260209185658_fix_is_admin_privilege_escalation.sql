-- CRITICAL SECURITY FIX: Prevent privilege escalation via is_admin column
-- Users should NOT be able to set is_admin=true on their own profile

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policy that excludes is_admin column for regular users
-- Users can update their own profile, but cannot change is_admin
CREATE POLICY "Users can update own profile (non-admin fields)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND (
        -- If user is not admin, they cannot change is_admin to true
        is_admin = false 
        OR 
        -- Only existing admins can have is_admin = true
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
);

-- Separate policy for admins to update any profile including is_admin
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));;
