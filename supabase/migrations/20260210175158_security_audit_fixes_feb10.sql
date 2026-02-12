
-- ============================================================
-- SECURITY AUDIT FIX: 10 Feb 2026
-- Fixes: S-02 (mutable search_path), P-01/P-02 (RLS initplan)
-- ============================================================

-- S-02: Fix mutable search_path on SECURITY DEFINER functions
-- Pin search_path to prevent search_path hijacking attacks

-- Fix create_order function
ALTER FUNCTION public.create_order SET search_path = public;

-- Fix admin_update_order_status function
ALTER FUNCTION public.admin_update_order_status SET search_path = public;

-- Fix get_dashboard_stats function
ALTER FUNCTION public.get_dashboard_stats SET search_path = public;

-- Fix get_site_setting function (from site_settings migration)
DO $$ BEGIN
  ALTER FUNCTION public.get_site_setting SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Fix any other SECURITY DEFINER functions
DO $$ BEGIN
  ALTER FUNCTION public.check_admin_status SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================
-- P-01/P-02: Optimize RLS policies to avoid initplan issues
-- Replace auth.uid() with (select auth.uid()) to prevent 
-- re-evaluation per row (subselect caching)
-- ============================================================

-- Drop and recreate orders policies with optimized auth check
DO $$ BEGIN
  -- Orders: users can view own orders
  DROP POLICY IF EXISTS "Users can view own orders" ON orders;
  CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = (SELECT auth.uid()));

  -- Orders: users can insert own orders  
  DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
  CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

  -- Profiles: users can view own profile
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = (SELECT auth.uid()));

  -- Profiles: users can update own profile
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;  
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = (SELECT auth.uid()));

  -- Addresses: users can manage own addresses
  DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
  CREATE POLICY "Users can view own addresses" ON addresses
    FOR SELECT USING (user_id = (SELECT auth.uid()));

  DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
  CREATE POLICY "Users can insert own addresses" ON addresses
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

  DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
  CREATE POLICY "Users can update own addresses" ON addresses
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

  DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
  CREATE POLICY "Users can delete own addresses" ON addresses
    FOR DELETE USING (user_id = (SELECT auth.uid()));
END $$;

-- ============================================================
-- S-03: Enable leaked password protection via Supabase Auth config
-- (This is done via Supabase Dashboard > Auth > Providers > Email)
-- Adding a comment here as documentation only
-- ============================================================
-- TO ENABLE: Go to Supabase Dashboard > Authentication > Providers > Email
-- Toggle ON "Leaked Password Protection"
;
