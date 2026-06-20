
-- Cleanup Duplicate Triggers and Redundant Functions
-- This migration removes redundant "updated_at" triggers identified during drift analysis.

BEGIN;

-- 1. Orders Cleanup: Remote has both trigger_orders_updated_at and update_orders_updated_at
-- We keep trigger_orders_updated_at for consistency.
DROP TRIGGER IF EXISTS "update_orders_updated_at" ON "public"."orders";
DROP TRIGGER IF EXISTS "trigger_update_orders_updated_at" ON "public"."orders";

-- 2. Products Cleanup: Remote has both set_updated_at_products and update_products_updated_at
DROP TRIGGER IF EXISTS "update_products_updated_at" ON "public"."products";

-- 3. Email Templates Cleanup: Remote has both set_updated_at_templates and set_updated_at_email_templates
DROP TRIGGER IF EXISTS "set_updated_at_templates" ON "public"."email_templates";

-- 4. Function Cleanup: Remove unused update functions
-- These were likely created by different migration paths or manual experimentation.
DROP FUNCTION IF EXISTS public.update_updated_at_column();

COMMIT;
