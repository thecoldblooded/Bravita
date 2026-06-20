-- Fix security issues: Mutable search path and permissive RLS

-- 1. Secure Functions with Fixed Search Path
-- Signatures verified from pg_proc
ALTER FUNCTION public.verify_promo_code(p_code text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.manage_inventory() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_order_promo() SET search_path = public, pg_catalog;

-- 2. Restrict "System can insert logs" RLS Policy
-- Original: WITH CHECK (true) for all roles (implied by lack of TO clause or TO PUBLIC)
-- New: Only service_role can insert.

DROP POLICY IF EXISTS "System can insert logs" ON public.promo_logs;

CREATE POLICY "System can insert logs"
ON public.promo_logs
FOR INSERT
TO service_role
WITH CHECK (true);
;
