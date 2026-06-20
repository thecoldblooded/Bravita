-- Fix linter warnings

-- 1. Function search path mutable
-- Fixes: Function `public.handle_updated_at` has a role mutable search_path
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- 2. Products multiple permissive policies
-- Warns: Table `public.products` has multiple permissive policies for role `authenticated` for action `SELECT`.
-- "Admins manage products" is defined FOR ALL, which matches SELECT.
-- "Admins view all products" is defined FOR SELECT.
-- Both checks are identical (public.is_admin_user()).
-- We only need the one that covers ALL operations.
DROP POLICY IF EXISTS "Admins view all products" ON public.products;

-- 3. Promo Codes multiple permissive policies
-- Warns: Table `public.promo_codes` has multiple permissive policies for role `authenticated` for action `SELECT`.
-- Similar redundancy as products.
DROP POLICY IF EXISTS "Admins view all promo codes" ON public.promo_codes;
