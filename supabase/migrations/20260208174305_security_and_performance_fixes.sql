-- ============================================
-- 1. FIX: RLS DISABLED IN PUBLIC
-- ============================================
ALTER TABLE public.promo_code_attempts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view promo code attempts') THEN
        CREATE POLICY "Admins can view promo code attempts" ON public.promo_code_attempts
        FOR SELECT TO authenticated
        USING ((SELECT (is_admin_user((SELECT auth.uid())))));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert promo code attempts') THEN
        CREATE POLICY "Authenticated users can insert promo code attempts" ON public.promo_code_attempts
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    END IF;
END $$;

-- ============================================
-- 2. FIX: FUNCTION SEARCH PATH MUTABLE
-- ============================================
ALTER FUNCTION public.create_order(jsonb, uuid, text, text) SET search_path = public;
ALTER FUNCTION public.admin_set_user_admin(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.sanitize_search_input(text) SET search_path = public;
ALTER FUNCTION public.is_admin_user() SET search_path = public;
ALTER FUNCTION public.is_admin_user(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.admin_update_order_status(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.admin_get_all_orders(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.manage_inventory() SET search_path = public;
ALTER FUNCTION public.log_admin_action() SET search_path = public;

-- ============================================
-- 3. FIX: AUTH RLS INITIALIZATION PLAN (PERFORMANCE)
--    AND 4. FIX: MULTIPLE PERMISSIVE POLICIES (CLEANUP)
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
CREATE POLICY "Users and admins can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))))
WITH CHECK (id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- ADDRESSES
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users and admins can view addresses" ON public.addresses;
CREATE POLICY "Users and admins can view addresses" ON public.addresses
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Admins can update any address" ON public.addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses" ON public.addresses
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))))
WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Admins can delete any address" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses" ON public.addresses
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
CREATE POLICY "Users can insert own addresses" ON public.addresses
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- ORDERS
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Users and admins can view orders" ON public.orders
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
DROP POLICY IF EXISTS "Users and admins can update orders" ON public.orders;
CREATE POLICY "Users and admins can update orders" ON public.orders
FOR UPDATE TO authenticated
USING (
    (user_id = (SELECT auth.uid()) AND status = 'pending') 
    OR (SELECT is_admin_user((SELECT auth.uid())))
)
WITH CHECK (
    (user_id = (SELECT auth.uid()) AND status = 'pending') 
    OR (SELECT is_admin_user((SELECT auth.uid())))
);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- ADMIN LOGS
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
FOR SELECT TO authenticated
USING ((SELECT is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Admins can view promo logs" ON public.promo_logs;
CREATE POLICY "Admins can view promo logs" ON public.promo_logs
FOR SELECT TO authenticated
USING ((SELECT is_admin_user((SELECT auth.uid()))));
;
