-- Fix admin_audit_log RLS and Admin Support access
-- Author: Antigravity
-- Date: 2026-02-10

BEGIN;

-- 1. Update is_admin_user() to honor superadmins
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add INSERT policy for admin_audit_log
-- Admins and Superadmins should be able to log their actions
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_log
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
        )
    );

-- 3. Update SELECT policy for admin_audit_log to honor superadmins
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
        )
    );

-- 4. Fix potential RLS issues for support_tickets (ensure admins can view all)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all support tickets" ON public.support_tickets
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
        )
    );

DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets" ON public.support_tickets
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
        )
    );

COMMIT;
