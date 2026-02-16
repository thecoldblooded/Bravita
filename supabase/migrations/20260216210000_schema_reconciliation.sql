
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

-- 2. Audit Log Drift Fix: Ensure standard uuid_generate_v4() usage if extension is present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        ALTER TABLE "public"."admin_audit_log" ALTER COLUMN "id" SET DEFAULT extensions.uuid_generate_v4();
    ELSE
        ALTER TABLE "public"."admin_audit_log" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- 3. Address Column Alignment
ALTER TABLE "public"."addresses" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "public"."addresses" ALTER COLUMN "city" SET DATA TYPE character varying(100) USING "city"::character varying(100);
ALTER TABLE "public"."addresses" ALTER COLUMN "postal_code" SET DATA TYPE character varying(20) USING "postal_code"::character varying(20);
ALTER TABLE "public"."addresses" ALTER COLUMN "street" SET DATA TYPE character varying(500) USING "street"::character varying(500);

-- 4. Sync Email Template Defaults and Columns
ALTER TABLE "public"."email_templates" 
  ADD COLUMN IF NOT EXISTS "allow_raw_html" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_auth_critical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowlist_fallback_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."email_templates" 
  ALTER COLUMN "normalization_version" SET DEFAULT 1,
  ALTER COLUMN "editor_schema" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "normalization_version" SET NOT NULL,
  ALTER COLUMN "editor_schema" SET NOT NULL;

-- 5. Profiles Consistency (Notifications and Admin Flags)
ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "email_notifications" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "order_notifications" BOOLEAN DEFAULT true,
  ALTER COLUMN "is_admin" SET NOT NULL,
  ALTER COLUMN "is_admin" SET DEFAULT false;

-- 6. Fix Site Settings constraints and nullability
ALTER TABLE "public"."site_settings"
  ALTER COLUMN "vat_rate" SET NOT NULL,
  ALTER COLUMN "shipping_cost" SET NOT NULL,
  ALTER COLUMN "free_shipping_threshold" SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_id_check') THEN
        ALTER TABLE public.site_settings DROP CONSTRAINT site_settings_id_check;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'one_row') THEN
        ALTER TABLE public.site_settings ADD CONSTRAINT one_row CHECK (id = 1);
    END IF;
END $$;

-- 7. Orders and Support Tickets Constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_currency_tl_only') THEN
        ALTER TABLE "public"."orders" ADD CONSTRAINT orders_currency_tl_only CHECK (currency = 'TL'::text) NOT VALID;
        ALTER TABLE "public"."orders" VALIDATE CONSTRAINT orders_currency_tl_only;
    END IF;
END $$;

ALTER TABLE "public"."support_tickets" 
  ALTER COLUMN "category" SET DEFAULT 'general'::text,
  ALTER COLUMN "status" SET DEFAULT 'open'::text;

-- 8. Deep-Check Constraints Alignment
DO $$ 
BEGIN
    -- profiles
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_format_check CHECK (phone IS NULL OR phone ~ '^\+[0-9]{10,15}$');
    
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type = ANY (ARRAY['individual'::text, 'company'::text]));

    -- email_templates
    ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_unresolved_policy_check;
    ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_unresolved_policy_check CHECK (unresolved_policy = ANY (ARRAY['block'::text, 'warn'::text, 'allowlist_fallback'::text]));

    -- orders
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_credit_card_requires_intent;
    ALTER TABLE public.orders ADD CONSTRAINT orders_credit_card_requires_intent CHECK (payment_method <> 'credit_card' OR payment_intent_id IS NOT NULL) NOT VALID;
END $$;

COMMIT;
