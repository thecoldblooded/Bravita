-- ============================================
-- Security Hardening Phase 1 (Critical fixes)
-- Date: 2026-02-12
-- ============================================

BEGIN;
-- Ensure privilege columns exist before protections
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;
-- Block self privilege escalation (is_admin / is_superadmin) for non-admin users
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND (
           OLD.is_admin IS DISTINCT FROM NEW.is_admin OR
           OLD.is_superadmin IS DISTINCT FROM NEW.is_superadmin
       )
       AND NOT EXISTS (
           SELECT 1
           FROM public.profiles p
           WHERE p.id = auth.uid()
             AND (p.is_admin = TRUE OR p.is_superadmin = TRUE)
       )
    THEN
        RAISE EXCEPTION 'Unauthorized privilege update attempt';
    END IF;

    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
WHEN (
    OLD.is_admin IS DISTINCT FROM NEW.is_admin OR
    OLD.is_superadmin IS DISTINCT FROM NEW.is_superadmin
)
EXECUTE FUNCTION public.prevent_profile_privilege_self_escalation();
-- Users must not update orders directly (status/payment/inventory manipulation risk)
DO $$
BEGIN
    IF to_regclass('public.orders') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders';
    END IF;
END $$;
-- Tighten order status history insert policy to service_role only
DO $$
BEGIN
    IF to_regclass('public.order_status_history') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "System can insert order status history" ON public.order_status_history';
        EXECUTE 'CREATE POLICY "System can insert order status history"
                 ON public.order_status_history
                 FOR INSERT
                 TO service_role
                 WITH CHECK (TRUE)';
    END IF;
END $$;
-- Integration rate-limit log table for backend-only abuse controls
CREATE TABLE IF NOT EXISTS public.integration_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    actor_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integration_rate_limits_lookup
ON public.integration_rate_limits (integration_name, action, actor_id, actor_email, created_at DESC);
ALTER TABLE public.integration_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert integration rate limits" ON public.integration_rate_limits;
CREATE POLICY "System can insert integration rate limits"
ON public.integration_rate_limits
FOR INSERT
TO service_role
WITH CHECK (TRUE);
DROP POLICY IF EXISTS "System can read integration rate limits" ON public.integration_rate_limits;
CREATE POLICY "System can read integration rate limits"
ON public.integration_rate_limits
FOR SELECT
TO service_role
USING (TRUE);
COMMIT;
