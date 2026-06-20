-- Restrict admin email management tables to superadmin users only.

BEGIN;

ALTER TABLE IF EXISTS public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Superadmins can manage email templates" ON public.email_templates;
CREATE POLICY "Superadmins can manage email templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_superadmin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_superadmin = true
  )
);

DROP POLICY IF EXISTS "Admins can manage email configs" ON public.email_configs;
DROP POLICY IF EXISTS "Superadmins can manage email configs" ON public.email_configs;
CREATE POLICY "Superadmins can manage email configs"
ON public.email_configs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_superadmin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_superadmin = true
  )
);

COMMIT;
