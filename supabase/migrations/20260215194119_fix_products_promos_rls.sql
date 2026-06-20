-- Fix MISSING RLS Policies for Products and Promo Codes
-- These tables had RLS enabled but NO policies, causing access denied (406) errors for everyone.

-- =========================================================================
-- 1. PRODUCTS
-- =========================================================================

-- Drop any existing policies to be safe
DROP POLICY IF EXISTS "Public read active products" ON products;
DROP POLICY IF EXISTS "Admins manage products" ON products;
DROP POLICY IF EXISTS "Admins view all products" ON products;

-- Policy 1: Public (Anon + Auth) can view ACTIVE products
CREATE POLICY "Public read active products"
ON products FOR SELECT
TO public
USING (is_active = true);

-- Policy 2: Admins can view ALL products (including inactive)
-- Note: 'authenticated' role includes admins.
-- This policy allows seeing rows where is_admin_user() is true.
-- Since policies are OR-ed, admins will see (active=true OR admin=true) -> ALL.
CREATE POLICY "Admins view all products"
ON products FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Policy 3: Admins can MANAGE products (Insert, Update, Delete)
CREATE POLICY "Admins manage products"
ON products FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());


-- =========================================================================
-- 2. PROMO CODES
-- =========================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Public read active promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Admins manage promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Admins view all promo codes" ON promo_codes;

-- Policy 1: Public can view ACTIVE promo codes
-- Required for PromotionMarquee and Checkout validation
CREATE POLICY "Public read active promo codes"
ON promo_codes FOR SELECT
TO public
USING (is_active = true);

-- Policy 2: Admins can view ALL promo codes
CREATE POLICY "Admins view all promo codes"
ON promo_codes FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Policy 3: Admins can MANAGE promo codes
CREATE POLICY "Admins manage promo codes"
ON promo_codes FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
