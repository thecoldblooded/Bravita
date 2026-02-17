-- Fix multiple permissive policies performance warning
-- We need to separate policies by role (anon vs authenticated) and action (select vs modification)
-- to ensure only ONE policy applies per role/action combination.
-- Note: PostgreSQL CREATE POLICY supports only ONE action or ALL. We must split commands.

-- =========================================================================
-- 1. PRODUCTS
-- =========================================================================

-- Drop existing policies completely to start fresh
DROP POLICY IF EXISTS "Public read active products" ON public.products;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
DROP POLICY IF EXISTS "Admins view all products" ON public.products;

-- Policy A: Anon (Unauthenticated) READ
CREATE POLICY "Anon read active products"
ON public.products FOR SELECT
TO anon
USING (is_active = true);

-- Policy B: Authenticated READ (Merged logic: Active OR Admin)
-- This covers both regular authenticated users (who see active) and admins (who see all)
CREATE POLICY "Authenticated read products"
ON public.products FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin_user());

-- Policy C: Admins WRITE (INSERT)
CREATE POLICY "Admins insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

-- Policy D: Admins WRITE (UPDATE)
CREATE POLICY "Admins update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Policy E: Admins WRITE (DELETE)
CREATE POLICY "Admins delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_admin_user());


-- =========================================================================
-- 2. PROMO CODES
-- =========================================================================

-- Drop existing policies completely
DROP POLICY IF EXISTS "Public read active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins view all promo codes" ON public.promo_codes;

-- Policy A: Anon (Unauthenticated) READ
CREATE POLICY "Anon read active promo codes"
ON public.promo_codes FOR SELECT
TO anon
USING (is_active = true);

-- Policy B: Authenticated READ (Merged logic: Active OR Admin)
CREATE POLICY "Authenticated read promo codes"
ON public.promo_codes FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin_user());

-- Policy C: Admins WRITE (INSERT)
CREATE POLICY "Admins insert promo codes"
ON public.promo_codes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

-- Policy D: Admins WRITE (UPDATE)
CREATE POLICY "Admins update promo codes"
ON public.promo_codes FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Policy E: Admins WRITE (DELETE)
CREATE POLICY "Admins delete promo codes"
ON public.promo_codes FOR DELETE
TO authenticated
USING (public.is_admin_user());
