-- Restrict access to Email Management and System Logs to SuperAdmins only
-- Also define is_superadmin_user() function for convenience

-- 1. Create is_superadmin_user function
CREATE OR REPLACE FUNCTION public.is_superadmin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_superadmin = true
  );
$$;

-- =========================================================================
-- 2. EMAIL TEMPLATE VARIABLES Optimizations (SuperAdmin Only)
-- =========================================================================

-- Drop previous broad admin policies
DROP POLICY IF EXISTS "Authenticated users view template variables" ON email_template_variables;
DROP POLICY IF EXISTS "Admins manage template variables" ON email_template_variables;
DROP POLICY IF EXISTS "Admins update template variables" ON email_template_variables;
DROP POLICY IF EXISTS "Admins delete template variables" ON email_template_variables;

-- Restrict SELECT to SuperAdmins (assuming users don't need to read templates directly via API)
-- If users need to read templates (e.g. for some frontend logic), revert this to Authenticated.
-- But usually templates are backend-only.
CREATE POLICY "SuperAdmins view template variables"
ON email_template_variables FOR SELECT
TO authenticated
USING (public.is_superadmin_user());

-- Restrict Manage to SuperAdmins
CREATE POLICY "SuperAdmins insert template variables"
ON email_template_variables FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin_user());

CREATE POLICY "SuperAdmins update template variables"
ON email_template_variables FOR UPDATE
TO authenticated
USING (public.is_superadmin_user());

CREATE POLICY "SuperAdmins delete template variables"
ON email_template_variables FOR DELETE
TO authenticated
USING (public.is_superadmin_user());


-- =========================================================================
-- 3. EMAIL VARIABLE REGISTRY Optimizations (SuperAdmin Only)
-- =========================================================================

DROP POLICY IF EXISTS "Authenticated users view variable registry" ON email_variable_registry;
DROP POLICY IF EXISTS "Admins insert variable registry" ON email_variable_registry;
DROP POLICY IF EXISTS "Admins update variable registry" ON email_variable_registry;
DROP POLICY IF EXISTS "Admins delete variable registry" ON email_variable_registry;

CREATE POLICY "SuperAdmins view variable registry"
ON email_variable_registry FOR SELECT
TO authenticated
USING (public.is_superadmin_user());

CREATE POLICY "SuperAdmins insert variable registry"
ON email_variable_registry FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin_user());

CREATE POLICY "SuperAdmins update variable registry"
ON email_variable_registry FOR UPDATE
TO authenticated
USING (public.is_superadmin_user());

CREATE POLICY "SuperAdmins delete variable registry"
ON email_variable_registry FOR DELETE
TO authenticated
USING (public.is_superadmin_user());


-- =========================================================================
-- 4. ADMIN AUDIT LOGS (SuperAdmin View, All Admin Insert)
-- =========================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins insert audit logs" ON admin_audit_log;
-- Also distinct old policies if any
DROP POLICY IF EXISTS "Admins can view all audit logs" ON admin_audit_log; 
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_log;

-- SELECT: Only SuperAdmins
CREATE POLICY "SuperAdmins view audit logs"
ON admin_audit_log FOR SELECT
TO authenticated
USING (public.is_superadmin_user());

-- INSERT: Admins and SuperAdmins (to log their actions)
-- We continue to use is_admin_user() which checks (is_admin OR is_superadmin)
CREATE POLICY "Admins insert audit logs"
ON admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());
