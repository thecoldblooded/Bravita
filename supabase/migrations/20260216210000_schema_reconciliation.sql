
-- Final Database Reconciliation and Drift Fix
-- This migration ensures total alignment between remote and local, specifically addressing RLS and function drift.

BEGIN;

-- 1. Ensure all profiles policies are idempotent and optimized
DROP POLICY IF EXISTS "Authenticated users view profiles" ON profiles;
DROP POLICY IF EXISTS "Users view own profiles" ON profiles;
DROP POLICY IF EXISTS "Admins view profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by owners and admins" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Authenticated users view profiles" 
ON profiles FOR SELECT 
TO authenticated
USING (
  (SELECT auth.uid()) = id 
  OR 
  (SELECT public.is_admin_user())
);

-- 2. Audit Log Drift Fix: Ensure standard gen_random_uuid() usage
ALTER TABLE "public"."admin_audit_log" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- 3. Address Column Alignment
ALTER TABLE "public"."addresses" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "public"."addresses" ALTER COLUMN "city" SET DATA TYPE character varying(100) USING "city"::character varying(100);
ALTER TABLE "public"."addresses" ALTER COLUMN "street" SET DATA TYPE character varying(500) USING "street"::character varying(500);

-- 4. Sync Email Template Defaults
ALTER TABLE "public"."email_templates" 
  ALTER COLUMN "normalization_version" SET DEFAULT 1,
  ALTER COLUMN "editor_schema" SET DEFAULT '{}'::jsonb;

-- 5. Fix Site Settings constraints consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_id_check') THEN
        ALTER TABLE public.site_settings DROP CONSTRAINT site_settings_id_check;
    END IF;
    ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_id_check CHECK (id = 1);
END $$;

COMMIT;
