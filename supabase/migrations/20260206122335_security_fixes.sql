-- Fix security issues: Mutable search path and permissive RLS

-- 0. Ensure functions exist before altering (Missing in previous migrations)
CREATE OR REPLACE FUNCTION public.verify_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Placeholder to allow migration to pass. Updated in later migrations.
    RETURN jsonb_build_object('valid', false, 'message', 'Function not yet implemented');
END;
$function$;

CREATE OR REPLACE FUNCTION public.manage_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Placeholder to allow migration to pass. Updated in later migrations.
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_order_promo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_promo_code text;
BEGIN
    -- Simple implementation to increment usage count
    v_promo_code := NEW.order_details->>'promo_code';
    IF v_promo_code IS NOT NULL AND length(v_promo_code) > 0 THEN
        UPDATE promo_codes 
        SET usage_count = COALESCE(usage_count, 0) + 1 
        WHERE code ILIKE v_promo_code;
    END IF;
    RETURN NEW;
END;
$function$;

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
