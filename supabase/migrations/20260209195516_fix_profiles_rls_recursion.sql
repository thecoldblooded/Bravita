BEGIN;

-- Drop old policies with exact names found in pg_policies
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile (non-admin fields)" ON public.profiles;

-- 1. SELECT: Users can see themselves, admins can see everyone
CREATE POLICY "Profiles are viewable by owners and admins" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR is_admin_user(auth.uid()));

-- 2. INSERT: Users can create their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- 3. UPDATE: Users can update their own profile (with admin protection), admins can update any
CREATE POLICY "Profiles are updatable by owners and admins" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() OR is_admin_user(auth.uid()))
WITH CHECK (
  (id = auth.uid() AND (is_admin = false OR is_admin_user(auth.uid())))
  OR 
  is_admin_user(auth.uid())
);

COMMIT;;
