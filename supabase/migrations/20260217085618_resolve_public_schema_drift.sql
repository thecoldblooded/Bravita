-- Reconcile remaining public schema drift detected by security-gate
-- Source: artifacts/drift-22090547121.sql
-- Goal: make local migration state converge with linked project schema (idempotent-safe)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Policy alignment: remove policies that exist in local shadow but not linked
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Users can view order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view review queue" ON public.payment_manual_review_queue;
DROP POLICY IF EXISTS "Allow admin insert access" ON public.products;
DROP POLICY IF EXISTS "Allow admin update access" ON public.products;
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
DROP POLICY IF EXISTS "Profiles updatable by owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Viewable by admins or public if active" ON public.promo_codes;
DROP POLICY IF EXISTS "Admin update access" ON public.site_settings;
DROP POLICY IF EXISTS "Public read access" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can perform all actions on tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
DROP POLICY IF EXISTS "Users read own payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Authenticated users can insert promo code attempts" ON public.promo_code_attempts;

-- ---------------------------------------------------------------------------
-- 2) Constraint / index / function cleanup
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_template_variables DROP CONSTRAINT IF EXISTS email_template_variables_insertion_order_check;
ALTER TABLE public.email_variable_registry DROP CONSTRAINT IF EXISTS email_variable_registry_key_format;
ALTER TABLE public.email_variable_registry DROP CONSTRAINT IF EXISTS email_variable_registry_render_policy_check;
ALTER TABLE public.email_variable_registry DROP CONSTRAINT IF EXISTS email_variable_registry_value_type_check;
ALTER TABLE public.email_template_variables DROP CONSTRAINT IF EXISTS email_template_variables_variable_key_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_currency_tl_only;

DROP FUNCTION IF EXISTS public.deduct_stock_on_order();
DROP FUNCTION IF EXISTS public.manage_stock_on_status_change();

ALTER TABLE public.email_variable_registry DROP CONSTRAINT IF EXISTS email_variable_registry_pkey;
DROP INDEX IF EXISTS public.email_variable_registry_pkey;

-- ---------------------------------------------------------------------------
-- 3) Column defaults / nullability / type alignment
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.email_logs ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE public.email_template_variables ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.email_template_variables ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.email_template_variables ALTER COLUMN insertion_order DROP NOT NULL;
ALTER TABLE public.email_template_variables ALTER COLUMN is_enabled DROP NOT NULL;
ALTER TABLE public.email_template_variables ALTER COLUMN is_required SET DEFAULT true;
ALTER TABLE public.email_template_variables ALTER COLUMN is_required DROP NOT NULL;
ALTER TABLE public.email_template_variables ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.email_template_variables ALTER COLUMN updated_at DROP NOT NULL;

ALTER TABLE public.email_templates ALTER COLUMN unresolved_policy DROP NOT NULL;

ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS category text DEFAULT 'general'::text;
ALTER TABLE public.email_variable_registry ALTER COLUMN category SET DEFAULT 'general'::text;
ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.email_variable_registry ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.email_variable_registry ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.email_variable_registry ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.email_variable_registry ALTER COLUMN is_active DROP NOT NULL;
ALTER TABLE public.email_variable_registry ALTER COLUMN is_sensitive DROP NOT NULL;
ALTER TABLE public.email_variable_registry ALTER COLUMN label DROP NOT NULL;
ALTER TABLE public.email_variable_registry ALTER COLUMN render_policy DROP NOT NULL;
ALTER TABLE public.email_variable_registry ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.email_variable_registry ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.email_variable_registry ALTER COLUMN value_type DROP NOT NULL;

ALTER TABLE public.order_status_history ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE public.order_status_history ALTER COLUMN status TYPE character varying(50) USING status::character varying(50);

ALTER TABLE public.products ALTER COLUMN price TYPE numeric(10,2) USING price::numeric(10,2);
ALTER TABLE public.products ALTER COLUMN stock SET NOT NULL;

ALTER TABLE public.profiles ALTER COLUMN user_type SET NOT NULL;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.site_settings DROP COLUMN IF EXISTS created_at;

-- ---------------------------------------------------------------------------
-- 4) Recreate constraints/indexes expected by linked schema
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS email_variable_registry_key_key ON public.email_variable_registry USING btree (key);
CREATE UNIQUE INDEX IF NOT EXISTS email_variable_registry_pkey ON public.email_variable_registry USING btree (id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_variable_registry_pkey'
      AND conrelid = 'public.email_variable_registry'::regclass
  ) THEN
    ALTER TABLE public.email_variable_registry
      ADD CONSTRAINT email_variable_registry_pkey PRIMARY KEY USING INDEX email_variable_registry_pkey;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_variable_registry_key_key'
      AND conrelid = 'public.email_variable_registry'::regclass
  ) THEN
    ALTER TABLE public.email_variable_registry
      ADD CONSTRAINT email_variable_registry_key_key UNIQUE USING INDEX email_variable_registry_key_key;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_template_variables_variable_key_fkey'
      AND conrelid = 'public.email_template_variables'::regclass
  ) THEN
    ALTER TABLE public.email_template_variables
      ADD CONSTRAINT email_template_variables_variable_key_fkey
      FOREIGN KEY (variable_key)
      REFERENCES public.email_variable_registry(key)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_template_variables_variable_key_fkey'
      AND conrelid = 'public.email_template_variables'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.email_template_variables
      VALIDATE CONSTRAINT email_template_variables_variable_key_fkey;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_currency_tl_only'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_currency_tl_only CHECK ((currency = 'TL'::text)) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_currency_tl_only'
      AND conrelid = 'public.orders'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.orders
      VALIDATE CONSTRAINT orders_currency_tl_only;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5) Function definition alignment
-- ---------------------------------------------------------------------------
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.prune_expired_otp_codes()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_checkout(p_product_slug text, p_quantity integer, p_promo_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_user_id UUID;
    v_profile_complete BOOLEAN;
    v_product RECORD;
    v_subtotal DECIMAL(10, 2);
    v_vat_rate DECIMAL(5, 4) := 0.20;
    v_vat_amount DECIMAL(10, 2);
    v_total DECIMAL(10, 2);
    v_order_id UUID;
BEGIN
    -- 1. Kullanıcı doğrulama
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Oturum açmanız gerekiyor'
        );
    END IF;

    -- 2. Profil tamamlanmış mı kontrol et
    SELECT profile_complete INTO v_profile_complete
    FROM profiles
    WHERE id = v_user_id;

    IF v_profile_complete IS NULL OR v_profile_complete = false THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PROFILE_INCOMPLETE',
            'message', 'Sipariş vermek için profilinizi tamamlamanız gerekiyor'
        );
    END IF;

    -- 3. Ürün bilgilerini al ve doğrula
    SELECT * INTO v_product
    FROM products
    WHERE slug = p_product_slug AND is_active = true;

    IF v_product IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PRODUCT_NOT_FOUND',
            'message', 'Ürün bulunamadı veya satışta değil'
        );
    END IF;

    -- 4. Miktar kontrolü
    IF p_quantity < 1 OR p_quantity > 10 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_QUANTITY',
            'message', 'Geçersiz miktar (1-10 arası olmalı)'
        );
    END IF;

    -- 5. Stok kontrolü
    IF v_product.stock < p_quantity THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INSUFFICIENT_STOCK',
            'message', 'Yeterli stok yok. Mevcut stok: ' || v_product.stock
        );
    END IF;

    -- 6. Fiyat hesaplama (SUNUCU TARAFINDA!)
    v_subtotal := v_product.price * p_quantity;
    v_vat_amount := v_subtotal * v_vat_rate;
    v_total := v_subtotal + v_vat_amount;

    -- 7. Sipariş oluştur
    INSERT INTO orders (
        user_id,
        product_id,
        quantity,
        unit_price,
        subtotal,
        vat_amount,
        total,
        status,
        promo_code
    ) VALUES (
        v_user_id,
        v_product.id,
        p_quantity,
        v_product.price,
        v_subtotal,
        v_vat_amount,
        v_total,
        'pending',
        p_promo_code
    )
    RETURNING id INTO v_order_id;

    -- 8. Stok güncelle
    UPDATE products
    SET stock = stock - p_quantity
    WHERE id = v_product.id;

    -- 9. Başarılı yanıt
    RETURN json_build_object(
        'success', true,
        'order_id', v_order_id,
        'product_name', v_product.name,
        'quantity', p_quantity,
        'unit_price', v_product.price,
        'subtotal', v_subtotal,
        'vat_amount', v_vat_amount,
        'total', v_total,
        'message', 'Sipariş başarıyla oluşturuldu'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Don't expose SQL error details - return generic message
        RETURN json_build_object(
            'success', false,
            'error', 'SERVER_ERROR',
            'message', 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_new_status text, p_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_old_status TEXT;
    v_order_details JSONB;
    v_payment_status TEXT;
    v_payment_method TEXT;
    v_payment_intent_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Admin check (Assumes function exists or falls back to role check)
    IF (SELECT count(*) FROM public.profiles WHERE id = auth.uid() AND is_admin = true) = 0 THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    -- 2. Fetch current order data
    SELECT status, order_details, payment_status, payment_method, payment_intent_id
    INTO v_old_status, v_order_details, v_payment_status, v_payment_method, v_payment_intent_id
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- 3. Transition validation
    IF v_old_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cancelled orders cannot be updated';
    END IF;

    IF p_new_status NOT IN ('pending', 'processing', 'preparing', 'shipped', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- 4. Cancellation Logic (Stock Restore)
    IF p_new_status = 'cancelled' THEN
        -- Financial status is intent-driven for card payments.
        IF v_payment_status = 'paid' THEN
            IF v_payment_method = 'credit_card' AND v_payment_intent_id IS NOT NULL THEN
                NULL; -- Do nothing, refund via payment intent API
            ELSE
                UPDATE public.orders SET payment_status = 'refunded' WHERE id = p_order_id;
            END IF;
        END IF;

        -- Restore stock for items
        FOR v_item IN
            SELECT *
            FROM jsonb_to_recordset(v_order_details->'items') AS x(product_id UUID, quantity INTEGER)
        LOOP
            IF v_item.product_id IS NOT NULL THEN
                UPDATE public.products
                SET stock = stock + v_item.quantity,
                    updated_at = NOW()
                WHERE id = v_item.product_id;
            END IF;
        END LOOP;

        -- Update reason
        UPDATE public.orders SET cancellation_reason = p_note WHERE id = p_order_id;
    END IF;

    -- 5. Update Order
    UPDATE public.orders
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_order_id;

    -- 6. Insert into Order Status History
    INSERT INTO public.order_status_history (order_id, status, note, created_by)
    VALUES (p_order_id, p_new_status, p_note, auth.uid());

    -- 7. Insert into Admin Audit Log (if table exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_audit_log') THEN
        INSERT INTO public.admin_audit_log (admin_user_id, action, target_table, target_id, details)
        VALUES (
            auth.uid(),
            'update_order_status',
            'orders',
            p_order_id,
            jsonb_build_object(
                'old_status', v_old_status,
                'new_status', p_new_status,
                'note', p_note
            )
        );
    END IF;

    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(start_date timestamp with time zone, end_date timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    total_revenue numeric;
    order_count int;
    cancelled_count int;
    daily_sales json;
    is_admin_user boolean;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO is_admin_user FROM profiles WHERE id = auth.uid();

    IF is_admin_user IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Calculate aggregate stats (active orders)
    SELECT
        COALESCE(SUM((order_details->>'total')::numeric), 0),
        COUNT(*)
    INTO total_revenue, order_count
    FROM orders
    WHERE created_at >= start_date AND created_at <= end_date
    AND status != 'cancelled';

    -- Calculate cancelled count
    SELECT COUNT(*)
    INTO cancelled_count
    FROM orders
    WHERE created_at >= start_date AND created_at <= end_date
    AND status = 'cancelled';

    -- Calculate daily sales breakdown (excluding cancelled)
    SELECT json_agg(t) INTO daily_sales
    FROM (
        SELECT
            date_trunc('day', created_at) as date,
            COUNT(*) as count,
            SUM((order_details->>'total')::numeric) as revenue
        FROM orders
        WHERE created_at >= start_date AND created_at <= end_date
        AND status != 'cancelled'
        GROUP BY 1
        ORDER BY 1
    ) t;

    RETURN json_build_object(
        'total_revenue', total_revenue,
        'order_count', order_count,
        'cancelled_count', cancelled_count,
        'daily_sales', COALESCE(daily_sales, '[]'::json)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_order_promo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_code text;
  v_discount numeric;
  v_promo_id uuid;
  v_current_usage int;
  v_limit int;
BEGIN
  -- Extract promo code from JSONB
  v_code := NEW.order_details->>'promo_code';
  v_discount := (NEW.order_details->>'discount')::numeric;

  -- If no code, exit
  IF v_code IS NULL OR v_code = '' THEN
    RETURN NEW;
  END IF;

  -- Find promo code (Locking)
  SELECT id, usage_count, usage_limit INTO v_promo_id, v_current_usage, v_limit
  FROM promo_codes
  WHERE code ILIKE v_code
  FOR UPDATE;

  IF v_promo_id IS NOT NULL THEN
    -- Increment usage
    UPDATE promo_codes
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = v_promo_id;

    -- Insert log
    INSERT INTO promo_logs (promo_code_id, order_id, user_id, discount_amount)
    VALUES (v_promo_id, NEW.id, NEW.user_id, v_discount);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_status boolean;
BEGIN
  -- Direct column access without triggering policy checks
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;

  RETURN COALESCE(admin_status, false);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6) Policies present in linked schema but missing from local shadow
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read settings" ON public.site_settings;
CREATE POLICY "Anyone can read settings"
ON public.site_settings
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins manage stock reservations" ON public.stock_reservations;
CREATE POLICY "Admins manage stock reservations"
ON public.stock_reservations
AS PERMISSIVE
FOR ALL
TO authenticated
USING ((SELECT public.is_admin_user() AS is_admin_user));

DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;
CREATE POLICY "support_tickets_update"
ON public.support_tickets
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (((user_id = (SELECT auth.uid() AS uid)) OR (SELECT public.is_admin_user() AS is_admin_user)))
WITH CHECK (((user_id = (SELECT auth.uid() AS uid)) OR (SELECT public.is_admin_user() AS is_admin_user)));

DROP POLICY IF EXISTS "Users read own payment intents" ON public.payment_intents;
CREATE POLICY "Users read own payment intents"
ON public.payment_intents
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (((SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Authenticated users can insert promo code attempts" ON public.promo_code_attempts;
CREATE POLICY "Authenticated users can insert promo code attempts"
ON public.promo_code_attempts
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

COMMIT;
