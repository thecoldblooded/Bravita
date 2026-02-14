-- Migration to capture manual changes made directly to the remote Supabase database and resolve CI drift.
-- This aligns the local migration history with the remote source of truth.

-- 1. Table Alignment: Addresses
ALTER TABLE "public"."addresses" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "public"."addresses" ALTER COLUMN "city" SET DATA TYPE character varying(100) USING "city"::character varying(100);
ALTER TABLE "public"."addresses" ALTER COLUMN "postal_code" SET DATA TYPE character varying(20) USING "postal_code"::character varying(20);
ALTER TABLE "public"."addresses" ALTER COLUMN "street" SET DATA TYPE character varying(500) USING "street"::character varying(500);

-- 2. Table Alignment: Orders
-- Drop policies depending on status/payment columns to allow type change
DROP POLICY IF EXISTS "Users and admins update orders" ON public.orders;

ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "shipping_company" TEXT;
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "tracking_number" character varying(100);
-- Align types with remote
ALTER TABLE "public"."orders" ALTER COLUMN "status" SET DATA TYPE character varying(50) USING "status"::character varying(50);
ALTER TABLE "public"."orders" ALTER COLUMN "payment_method" SET DATA TYPE character varying(50) USING "payment_method"::character varying(50);
ALTER TABLE "public"."orders" ALTER COLUMN "payment_status" SET DATA TYPE character varying(50) USING "payment_status"::character varying(50);

-- Recreate policies for orders
CREATE POLICY "Users and admins update orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  ((user_id = (SELECT auth.uid())) AND (status = 'pending')) OR 
  (SELECT is_admin_user((SELECT auth.uid())))
)
WITH CHECK (
  ((user_id = (SELECT auth.uid())) AND (status = 'pending')) OR 
  (SELECT is_admin_user((SELECT auth.uid())))
);


-- 3. Table Alignment: Profiles
-- Remove columns that don't exist in production to prevent drift
ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "avatar_url";
ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "tax_number";
ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "tax_office";

-- Add columns found in production but missing in some local paths
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "oauth_provider" character varying(50);
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "phone_verified_at" timestamp without time zone;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "email_notifications" boolean DEFAULT true;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "order_notifications" boolean DEFAULT true;

-- Align lengths and types
ALTER TABLE "public"."profiles" ALTER COLUMN "email" SET DATA TYPE character varying(255) USING "email"::character varying(255);
ALTER TABLE "public"."profiles" ALTER COLUMN "full_name" SET DATA TYPE character varying(255) USING "full_name"::character varying(255);
ALTER TABLE "public"."profiles" ALTER COLUMN "company_name" SET DATA TYPE character varying(255) USING "company_name"::character varying(255);
ALTER TABLE "public"."profiles" ALTER COLUMN "phone" SET DATA TYPE character varying(20) USING "phone"::character varying(20);
ALTER TABLE "public"."profiles" ALTER COLUMN "user_type" SET DATA TYPE character varying(50) USING "user_type"::character varying(50);

-- 4. Indices Alignment
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_by ON public.order_status_history USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_id ON public.orders USING btree (shipping_address_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_shipping_address_id ON public.payment_intents USING btree (shipping_address_id);
CREATE INDEX IF NOT EXISTS idx_payment_manual_review_intent_id ON public.payment_manual_review_queue USING btree (intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_manual_review_order_id ON public.payment_manual_review_queue USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_id ON public.stock_reservations USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON public.support_tickets USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_replied_by ON public.support_tickets USING btree (replied_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);

-- 5. Trigger Alignment (Ensure clean recreation of triggers that were out of sync)
DROP TRIGGER IF EXISTS trigger_handle_promo_usage ON public.orders;
CREATE TRIGGER trigger_handle_promo_usage AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_promo();

DROP TRIGGER IF EXISTS trigger_manage_inventory ON public.orders;
CREATE TRIGGER trigger_manage_inventory AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.manage_inventory();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Function Alignment (Extracted from drift to match remote state exactly)
CREATE OR REPLACE FUNCTION public.finalize_reservation(p_id uuid, quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products
  SET reserved_stock = GREATEST(0, reserved_stock - quantity)
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_promo_usage(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_usage INT;
  v_limit INT;
BEGIN
  SELECT usage_count, usage_limit INTO v_current_usage, v_limit
  FROM promo_codes 
  WHERE code ILIKE p_code 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF v_limit IS NOT NULL AND v_current_usage >= v_limit THEN
    RETURN FALSE;
  END IF;
  
  UPDATE promo_codes 
  SET usage_count = COALESCE(usage_count, 0) + 1 
  WHERE code ILIKE p_code;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_stock(p_id uuid, quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products
  SET stock = stock - quantity,
      reserved_stock = reserved_stock + quantity
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_stock(p_id uuid, quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products
  SET stock = stock + quantity,
      reserved_stock = GREATEST(0, reserved_stock - quantity)
  WHERE id = p_id;
END;
$function$;
