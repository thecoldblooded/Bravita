-- Supabase Linter Fixes: Security and Performance
-- 1. Security: Set search_path for mutable functions
-- 2. Performance: Auth RLS Init Plan (Subquery for auth functions)
-- 3. Performance: Multiple Permissive Policies (Avoid policy overlap)

BEGIN;

-- 1. SECURITY: Set search_path for mutable functions to prevent search-path hijacking

ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.normalize_email_token_key(text) SET search_path = public, pg_catalog;

-- 2. PERFORMANCE: Auth RLS Init Plan & Multiple Permissive Policies

-- email_variable_registry
-- Combine into mutations-only policy + optimized select policy
DROP POLICY IF EXISTS "Admins can manage email variable registry" ON public.email_variable_registry;
DROP POLICY IF EXISTS "Public read variable registry" ON public.email_variable_registry;

CREATE POLICY "Admins manage email variable registry"
ON public.email_variable_registry
FOR ALL
TO authenticated
USING ( (SELECT is_admin_user()) )
WITH CHECK ( (SELECT is_admin_user()) );

CREATE POLICY "Public read variable registry"
ON public.email_variable_registry
FOR SELECT
TO authenticated
USING ( true );

-- email_template_variables
-- Combine into mutations-only policy + optimized select policy
DROP POLICY IF EXISTS "Admins can manage email template variables" ON public.email_template_variables;
DROP POLICY IF EXISTS "Public read template variables" ON public.email_template_variables;

CREATE POLICY "Admins manage email template variables"
ON public.email_template_variables
FOR ALL
TO authenticated
USING ( (SELECT is_admin_user()) )
WITH CHECK ( (SELECT is_admin_user()) );

CREATE POLICY "Public read template variables"
ON public.email_template_variables
FOR SELECT
TO authenticated
USING ( true );

-- email_logs
-- Optimized initplan for superadmin check
DROP POLICY IF EXISTS "Superadmins can read email logs" ON public.email_logs;
CREATE POLICY "Superadmins can read email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_superadmin = true
  )
);

-- email_templates
-- Optimized initplan for superadmin check
DROP POLICY IF EXISTS "Superadmins can manage email templates" ON public.email_templates;
CREATE POLICY "Superadmins can manage email templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_superadmin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_superadmin = true
  )
);

-- email_configs
-- Optimized initplan for superadmin check
DROP POLICY IF EXISTS "Superadmins can manage email configs" ON public.email_configs;
CREATE POLICY "Superadmins can manage email configs"
ON public.email_configs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_superadmin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_superadmin = true
  )
);

-- payment_transactions
-- Resolve Multiple Permissive Policies for SELECT
DROP POLICY IF EXISTS "Admins manage payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;

CREATE POLICY "Admins manage payment transactions"
ON public.payment_transactions
FOR ALL
TO authenticated
USING ( (SELECT is_admin_user()) )
WITH CHECK ( (SELECT is_admin_user()) );

CREATE POLICY "Select payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
  (SELECT is_admin_user())
  OR 
  EXISTS (
    SELECT 1 FROM public.payment_intents
    WHERE payment_intents.id = payment_transactions.intent_id
      AND payment_intents.user_id = (SELECT auth.uid())
  )
);

COMMIT;
