
-- Security Fixes:
-- 1. Explicit search_path for triggers to prevent search_path hijacking
-- 2. Add RLS policies for internal tables to satisfy warnings and allow admin access

BEGIN;

-- 1. Fix search_path for SECURITY DEFINER triggers
ALTER FUNCTION public.handle_user_confirmation_email() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_catalog;

-- 2. Add RLS policies for payment_manual_review_queue (Admins only)
-- Previously it had no policies (closed to all), but admins might need to see it.
DROP POLICY IF EXISTS "Admins can view review queue" ON public.payment_manual_review_queue;
CREATE POLICY "Admins can view review queue"
ON public.payment_manual_review_queue
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_admin_user())
);

-- 3. Add RLS policies for payment_webhook_events (Admins only - for debugging)
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins can view webhook events"
ON public.payment_webhook_events
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_admin_user())
);

COMMIT;
;
