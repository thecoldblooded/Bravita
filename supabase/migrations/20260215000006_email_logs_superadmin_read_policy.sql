-- Restrict admin email log visibility to superadmin users only.
-- Service role policies remain intact for system writes/reads.

BEGIN;

ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Superadmins can read email logs" ON public.email_logs;

CREATE POLICY "Superadmins can read email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_superadmin = true
  )
);

COMMIT;
