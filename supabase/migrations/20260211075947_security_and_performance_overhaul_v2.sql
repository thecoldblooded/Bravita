-- Security & Performance Overhaul - 2026-02-11 (v2)

-- Note: skipping extension schema move as pg_net doesn't support it directly

-- 2. Function security fixes
-- Ensure search_path is secure to prevent search_path injection attacks
ALTER FUNCTION is_admin_user(UUID) SET search_path = public;
ALTER FUNCTION is_admin() SET search_path = public;

-- 3. Policy Cleanup & Optimization (initplan optimization)

-- addresses: Consolidate 'Users and admins can view addresses' and 'Users can view own addresses'
DROP POLICY IF EXISTS "Users and admins can view addresses" ON addresses;
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users and admins view addresses" ON addresses
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR 
  (SELECT is_admin_user((SELECT auth.uid())))
);

-- admin_audit_log: Consolidate 'Admins can view audit logs' and 'Superadmins can view audit logs'
-- and fix initplan for INSERT
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON admin_audit_log;
CREATE POLICY "Admins view audit logs" ON admin_audit_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND (is_admin = true OR is_superadmin = true)
  )
);

DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_log;
CREATE POLICY "Admins insert audit logs" ON admin_audit_log
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND (is_admin = true OR is_superadmin = true)
  )
);

-- orders: Consolidate SELECT policies and fix initplan for UPDATE
DROP POLICY IF EXISTS "Users and admins can view orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users and admins view orders" ON orders
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR 
  (SELECT is_admin_user((SELECT auth.uid())))
);

DROP POLICY IF EXISTS "Users and admins can update orders" ON orders;
CREATE POLICY "Users and admins update orders" ON orders
FOR UPDATE TO authenticated
USING (
  ((user_id = (SELECT auth.uid())) AND (status = 'pending')) OR 
  (SELECT is_admin_user((SELECT auth.uid())))
)
WITH CHECK (
  ((user_id = (SELECT auth.uid())) AND (status = 'pending')) OR 
  (SELECT is_admin_user((SELECT auth.uid())))
);

-- profiles: Consolidate SELECT and UPDATE policies
DROP POLICY IF EXISTS "Profiles are viewable by owners and admins" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Profiles viewable by owners and admins" ON profiles
FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid()) OR 
  (SELECT is_admin())
);

DROP POLICY IF EXISTS "Profiles are updatable by owners and admins" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Profiles updatable by owners and admins" ON profiles
FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid()) OR 
  (SELECT is_admin())
)
WITH CHECK (
  id = (SELECT auth.uid()) OR 
  (SELECT is_admin())
);

-- support_tickets: Fix permissive INSERT, multiple policies, and initplan
DROP POLICY IF EXISTS "Admin full access" ON support_tickets; -- This was ALL
DROP POLICY IF EXISTS "Everyone can insert tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users view own tickets" ON support_tickets;

-- Only authenticated users or admins can access all rows
CREATE POLICY "Admin full access" ON support_tickets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND (is_admin = true OR is_superadmin = true)
  )
);

-- Users can only see their own tickets
CREATE POLICY "Users view own tickets" ON support_tickets
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

-- Secure INSERT: authenticated users must match their ID, anon users can still insert
CREATE POLICY "Authenticated users insert own tickets" ON support_tickets
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = (SELECT auth.uid())) OR 
  (SELECT is_admin())
);

CREATE POLICY "Anonymous users can insert tickets" ON support_tickets
FOR INSERT TO anon
WITH CHECK (
  name IS NOT NULL AND 
  email IS NOT NULL AND 
  subject IS NOT NULL AND 
  message IS NOT NULL
);

-- site_settings: Fix initplan optimization
DROP POLICY IF EXISTS "Only admins can update settings" ON site_settings;
CREATE POLICY "Only admins update settings" ON site_settings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) AND is_admin = true
  )
);
;
