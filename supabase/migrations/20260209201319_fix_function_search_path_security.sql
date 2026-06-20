-- Fix for function_search_path_mutable
ALTER FUNCTION public.check_default_address_deletion() SET search_path = '';

-- Fix for auth_rls_initplan in profiles table
-- We need to drop and recreate or alter the policies

-- 1. Profiles are viewable by owners and admins
DROP POLICY IF EXISTS "Profiles are viewable by owners and admins" ON public.profiles;
CREATE POLICY "Profiles are viewable by owners and admins" ON public.profiles
FOR SELECT USING (
    id = (select auth.uid()) 
    OR 
    (select public.is_admin_user())
);

-- 2. Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (id = (select auth.uid()));

-- 3. Profiles are updatable by owners and admins
DROP POLICY IF EXISTS "Profiles are updatable by owners and admins" ON public.profiles;
CREATE POLICY "Profiles are updatable by owners and admins" ON public.profiles
FOR UPDATE USING (
    id = (select auth.uid()) 
    OR 
    (select public.is_admin_user())
);

-- Fix for multiple_permissive_policies on promo_codes
-- Combine "Admin full access" and "Public can view active" for SELECT
DROP POLICY IF EXISTS "Admin full access for promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Public can view active promo codes" ON public.promo_codes;

CREATE POLICY "Viewable by admins or public if active" ON public.promo_codes
FOR SELECT USING (
    (select public.is_admin_user())
    OR 
    (is_active = true)
);

-- Fix for unindexed_foreign_keys
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);
;
