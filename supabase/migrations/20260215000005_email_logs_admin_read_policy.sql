-- Allow admin/superadmin users to read email logs in Admin panel.
-- Existing service_role policies remain intact for system writes/reads.

BEGIN;

ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
CREATE POLICY "Admins can read email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_admin = true OR p.is_superadmin = true)
  )
);

COMMIT;
