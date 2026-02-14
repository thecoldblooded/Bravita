-- Final Security & Performance Fix - 2026-02-11 (v3)

-- 1. Fix mutable search path for is_admin_user() Functions
ALTER FUNCTION is_admin_user() SET search_path = public;
ALTER FUNCTION is_admin_user(UUID) SET search_path = public;

-- 2. Consolidate support_tickets policies to remove "Multiple Permissive Policies" warning
DROP POLICY IF EXISTS "Admin full access" ON support_tickets;
DROP POLICY IF EXISTS "Users view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users insert own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users insert own tickets" ON support_tickets; -- Just in case
DROP POLICY IF EXISTS "support_tickets_select" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_authenticated" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_anon" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_admin_update" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_admin_delete" ON support_tickets;
DROP POLICY IF EXISTS "Anonymous users can insert tickets" ON support_tickets;

-- SELECT: Owner or Admin
CREATE POLICY "support_tickets_select" ON support_tickets
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR 
  (SELECT is_admin_user())
);

-- INSERT: Owner or Admin
CREATE POLICY "support_tickets_insert_authenticated" ON support_tickets
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = (SELECT auth.uid())) OR 
  (SELECT is_admin_user())
);

-- Separate policy for anon (no conflict)
CREATE POLICY "support_tickets_insert_anon" ON support_tickets
FOR INSERT TO anon
WITH CHECK (
  name IS NOT NULL AND 
  email IS NOT NULL AND 
  subject IS NOT NULL AND 
  message IS NOT NULL
);

-- UPDATE: Admin Only
CREATE POLICY "support_tickets_admin_update" ON support_tickets
FOR UPDATE TO authenticated
USING ((SELECT is_admin_user()))
WITH CHECK ((SELECT is_admin_user()));

-- DELETE: Admin Only
CREATE POLICY "support_tickets_admin_delete" ON support_tickets
FOR DELETE TO authenticated
USING ((SELECT is_admin_user()));

-- 3. Extension Management
-- Note: 'pg_net' schema move/reinstall is skipping because it often requires superuser/dashboard-level perms
-- or has active dependencies. We will prioritize functionality over this specific warning.
;
