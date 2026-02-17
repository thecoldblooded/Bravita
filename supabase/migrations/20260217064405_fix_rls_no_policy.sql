-- Fix RLS Enabled No Policy warnings
-- 1. payment_manual_review_queue
-- 2. payment_webhook_events

-- =========================================================================
-- 1. payment_manual_review_queue
-- =========================================================================

-- Admins should be able to view and manage the review queue
DROP POLICY IF EXISTS "Admins can manage payment reviews" ON public.payment_manual_review_queue;
CREATE POLICY "Admins can manage payment reviews"
ON public.payment_manual_review_queue
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());


-- =========================================================================
-- 2. payment_webhook_events
-- =========================================================================

-- Admins should be able to view webhook logs for debugging
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins can view webhook events"
ON public.payment_webhook_events
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- No public access or client-side insert allowed for standard users.
-- Service role (Edge Functions) bypasses RLS, so webhook ingestion will still work.
