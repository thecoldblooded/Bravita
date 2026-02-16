-- Optimize RLS policies to fix performance warnings (auth_rls_initplan, multiple_permissive_policies)

-- =========================================================================
-- 1. PROFILES Optimizations
-- =========================================================================

-- Consolidate multiple SELECT policies for authenticated users into one.
-- Also wrap auth.uid() in (SELECT auth.uid()) for caching.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Authenticated users view profiles" 
ON profiles FOR SELECT 
TO authenticated
USING (
  (SELECT auth.uid()) = id 
  OR 
  (SELECT is_admin_user())
);

-- Optimize UPDATE policy (auth.uid caching)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated
USING ((SELECT auth.uid()) = id);


-- =========================================================================
-- 2. EMAIL TEMPLATE VARIABLES Optimizations
-- =========================================================================

-- The "Public read template variables" policy allows SELECT for everyone authenticated.
-- The "Admins manage email template variables" allows ALL for admins.
-- Problem: For SELECT, both run.
-- Fix: Exclude SELECT from the Admin policy, rely on the Public Read policy for SELECT.
-- OR redefine Admin policy to cover only non-SELECT operations? No, policies are per-cmd or ALL.
-- Best approach: Define explicit policies per command for clarity and performance.

DROP POLICY IF EXISTS "Admins manage email template variables" ON email_template_variables;
DROP POLICY IF EXISTS "Public read template variables" ON email_template_variables;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users view template variables"
ON email_template_variables FOR SELECT
TO authenticated
USING (true);

-- Admins can insert/update/delete
CREATE POLICY "Admins manage template variables"
ON email_template_variables FOR INSERT
TO authenticated
WITH CHECK ((SELECT is_admin_user()));

CREATE POLICY "Admins update template variables"
ON email_template_variables FOR UPDATE
TO authenticated
USING ((SELECT is_admin_user()));

CREATE POLICY "Admins delete template variables"
ON email_template_variables FOR DELETE
TO authenticated
USING ((SELECT is_admin_user()));


-- =========================================================================
-- 3. EMAIL VARIABLE REGISTRY Optimizations (Similar to above)
-- =========================================================================

DROP POLICY IF EXISTS "Admins manage email variable registry" ON email_variable_registry;
DROP POLICY IF EXISTS "Public read variable registry" ON email_variable_registry;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users view variable registry"
ON email_variable_registry FOR SELECT
TO authenticated
USING (true);

-- Admins can manage
CREATE POLICY "Admins insert variable registry"
ON email_variable_registry FOR INSERT
TO authenticated
WITH CHECK ((SELECT is_admin_user()));

CREATE POLICY "Admins update variable registry"
ON email_variable_registry FOR UPDATE
TO authenticated
USING ((SELECT is_admin_user()));

CREATE POLICY "Admins delete variable registry"
ON email_variable_registry FOR DELETE
TO authenticated
USING ((SELECT is_admin_user()));


-- =========================================================================
-- 4. PAYMENT TRANSACTIONS Optimizations
-- =========================================================================

-- Existing: "Admins manage..." (ALL) vs "Select payment transactions" (SELECT, checks admin OR user ownership)
-- Fix: Remove SELECT from "Admins manage", let "Select payment transactions" handle it (which already includes admin check).

DROP POLICY IF EXISTS "Admins manage payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Select payment transactions" ON payment_transactions;

-- Unified SELECT policy (Admins OR Owners)
CREATE POLICY "View payment transactions"
ON payment_transactions FOR SELECT
TO authenticated
USING (
  (SELECT is_admin_user())
  OR 
  EXISTS (
    SELECT 1 FROM payment_intents
    WHERE payment_intents.id = payment_transactions.intent_id
    AND payment_intents.user_id = (SELECT auth.uid())
  )
);

-- Admin Management (Insert/Update/Delete)
CREATE POLICY "Admins insert payment transactions"
ON payment_transactions FOR INSERT
TO authenticated
WITH CHECK ((SELECT is_admin_user()));

CREATE POLICY "Admins update payment transactions"
ON payment_transactions FOR UPDATE
TO authenticated
USING ((SELECT is_admin_user()));

CREATE POLICY "Admins delete payment transactions"
ON payment_transactions FOR DELETE
TO authenticated
USING ((SELECT is_admin_user()));
