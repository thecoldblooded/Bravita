drop trigger if exists "set_updated_at_auth_template_sync_idempotency" on "public"."auth_template_sync_idempotency";

drop policy "System can insert auth template sync idempotency" on "public"."auth_template_sync_idempotency";

drop policy "System can read auth template sync idempotency" on "public"."auth_template_sync_idempotency";

drop policy "System can update auth template sync idempotency" on "public"."auth_template_sync_idempotency";

revoke delete on table "public"."auth_template_sync_idempotency" from "anon";

revoke insert on table "public"."auth_template_sync_idempotency" from "anon";

revoke references on table "public"."auth_template_sync_idempotency" from "anon";

revoke select on table "public"."auth_template_sync_idempotency" from "anon";

revoke trigger on table "public"."auth_template_sync_idempotency" from "anon";

revoke truncate on table "public"."auth_template_sync_idempotency" from "anon";

revoke update on table "public"."auth_template_sync_idempotency" from "anon";

revoke delete on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke insert on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke references on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke select on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke trigger on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke truncate on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke update on table "public"."auth_template_sync_idempotency" from "authenticated";

revoke delete on table "public"."auth_template_sync_idempotency" from "service_role";

revoke insert on table "public"."auth_template_sync_idempotency" from "service_role";

revoke references on table "public"."auth_template_sync_idempotency" from "service_role";

revoke select on table "public"."auth_template_sync_idempotency" from "service_role";

revoke trigger on table "public"."auth_template_sync_idempotency" from "service_role";

revoke truncate on table "public"."auth_template_sync_idempotency" from "service_role";

revoke update on table "public"."auth_template_sync_idempotency" from "service_role";

alter table "public"."auth_template_sync_idempotency" drop constraint "auth_template_sync_idempotency_actor_id_fkey";

alter table "public"."auth_template_sync_idempotency" drop constraint "auth_template_sync_idempotency_response_status_check";

alter table "public"."auth_template_sync_idempotency" drop constraint "auth_template_sync_idempotency_pkey";

drop index if exists "public"."auth_template_sync_idempotency_pkey";

drop index if exists "public"."idx_auth_template_sync_idempotency_actor_created";

drop index if exists "public"."idx_auth_template_sync_idempotency_actor_key";

drop index if exists "public"."idx_auth_template_sync_idempotency_created";

drop table "public"."auth_template_sync_idempotency";

set check_function_bodies = off;

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
$function$
;

CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_shipping_address_id uuid, p_payment_method text, p_promo_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_product_price DECIMAL(10,2);
    v_product_stock INT;
    v_qty INT;
    v_item_subtotal DECIMAL(10,2);
    v_total_subtotal DECIMAL(10,2) := 0;
    v_total_vat DECIMAL(10,2) := 0;
    v_shipping_cost DECIMAL(10,2);
    v_vat_rate DECIMAL(10,4);
    v_shipping_threshold DECIMAL(12,2);
    v_final_total DECIMAL(10,2);
    v_discount DECIMAL(10,2) := 0;
    v_order_id UUID;
    v_valid_items JSONB := '[]'::JSONB;
    v_item_detail JSONB;
    v_order_details JSONB;
    v_bank_ref TEXT := NULL;
    v_address_owner UUID;
    v_promo_result JSON;
    v_item_total_cents BIGINT := 0;
    v_vat_total_cents BIGINT := 0;
    v_shipping_total_cents BIGINT := 0;
    v_discount_total_cents BIGINT := 0;
    v_paid_total_cents BIGINT := 0;
    v_item_index INT := 0;
    v_items_count INT := 0;
    v_sqlstate TEXT;
    v_errmsg TEXT;
    v_errdetail TEXT;
    v_errhint TEXT;
    v_errcontext TEXT;
BEGIN
    v_items_count := CASE
        WHEN p_items IS NULL THEN 0
        WHEN jsonb_typeof(p_items) = 'array' THEN jsonb_array_length(p_items)
        ELSE 0
    END;

    RAISE LOG 'create_order start payment_method=%, shipping_address_id=%, promo_code=%, items_count=%',
        COALESCE(p_payment_method, 'null'),
        COALESCE(p_shipping_address_id::text, 'null'),
        COALESCE(p_promo_code, 'null'),
        v_items_count;

    -- Card flow must use payment_intent + 3D finalize path
    IF p_payment_method <> 'bank_transfer' THEN
        RAISE LOG 'create_order rejected_non_bank_transfer payment_method=%', COALESCE(p_payment_method, 'null');
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Kart odemeleri yeni 3D akisi ile alinmaktadir. Lutfen kart odeme endpointini kullanin.'
        );
    END IF;

    -- 1. Get User ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE LOG 'create_order missing_auth_user';
        RETURN jsonb_build_object('success', false, 'message', 'Oturum açmanız gerekiyor');
    END IF;

    RAISE LOG 'create_order auth_user_id=%', v_user_id;

    -- 2. Address Ownership Check (IDOR Security Fix)
    SELECT user_id INTO v_address_owner FROM public.addresses WHERE id = p_shipping_address_id;
    IF v_address_owner IS NULL OR v_address_owner != v_user_id THEN
        RAISE LOG 'create_order invalid_address owner=% requester=% address_id=%',
            COALESCE(v_address_owner::text, 'null'),
            COALESCE(v_user_id::text, 'null'),
            COALESCE(p_shipping_address_id::text, 'null');
        RETURN jsonb_build_object('success', false, 'message', 'Geçersiz adres seçimi: Adres size ait değil.');
    END IF;

    -- 3. Iterate input items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_index := v_item_index + 1;
        RAISE LOG 'create_order item[%] raw product_id=%, quantity=%',
            v_item_index,
            COALESCE(v_item->>'product_id', 'null'),
            COALESCE(v_item->>'quantity', 'null');

        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        -- Negative Quantity Check (Logic Security Fix)
        IF v_qty <= 0 THEN
            RAISE LOG 'create_order item[%] invalid_quantity=%', v_item_index, v_qty;
            RETURN jsonb_build_object('success', false, 'message', 'Geçersiz ürün miktarı: 0 veya negatif olamaz.');
        END IF;

        -- Get product from DB WITH LOCK (Race Condition Fix)
        SELECT id, name, price, stock
        INTO v_product_id, v_product_name, v_product_price, v_product_stock
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE LOG 'create_order item[%] product_not_found product_id=%', v_item_index, COALESCE(v_product_id::text, 'null');
            RETURN jsonb_build_object('success', false, 'message', 'Ürün bulunamadı: ID ' || v_product_id);
        END IF;

        -- Check stock validity
        IF v_product_stock < v_qty THEN
            RAISE LOG 'create_order item[%] insufficient_stock product_id=% stock=% requested_qty=%',
                v_item_index,
                COALESCE(v_product_id::text, 'null'),
                v_product_stock,
                v_qty;
            RETURN jsonb_build_object('success', false, 'message', 'Yetersiz stok: ' || v_product_name);
        END IF;

        RAISE LOG 'create_order item[%] resolved product_id=% name=% unit_price=% stock=% qty=%',
            v_item_index,
            v_product_id,
            COALESCE(v_product_name, 'null'),
            v_product_price,
            v_product_stock,
            v_qty;

        -- Calculate item totals using DB price
        v_item_subtotal := v_product_price * v_qty;
        v_total_subtotal := v_total_subtotal + v_item_subtotal;

        -- Build item detail
        v_item_detail := jsonb_build_object(
            'product_id', v_product_id,
            'product_name', v_product_name,
            'quantity', v_qty,
            'unit_price', v_product_price,
            'subtotal', v_item_subtotal
        );

        v_valid_items := v_valid_items || v_item_detail;
    END LOOP;

    -- 4. VAT & Shipping Settings
    SELECT
        COALESCE(vat_rate, 0.20),
        COALESCE(shipping_cost, 49.90),
        COALESCE(free_shipping_threshold, 1500.0)
    INTO v_vat_rate, v_shipping_cost, v_shipping_threshold
    FROM public.site_settings
    WHERE id = 1;

    -- 5. VAT calculation
    v_total_vat := v_total_subtotal * v_vat_rate;

    -- 6. Promo Code (Backend Logic using verify_promo_code)
    v_discount := 0;
    IF p_promo_code IS NOT NULL AND length(p_promo_code) > 0 THEN
        BEGIN
            SELECT public.verify_promo_code(p_promo_code) INTO v_promo_result;

            IF (v_promo_result->>'valid')::boolean = true THEN
                IF (v_promo_result->>'discount_type') = 'percentage' THEN
                    v_discount := (v_total_subtotal + v_total_vat) * ((v_promo_result->>'discount_value')::decimal / 100);
                    IF (v_promo_result->>'max_discount_amount') IS NOT NULL AND v_discount > (v_promo_result->>'max_discount_amount')::decimal THEN
                        v_discount := (v_promo_result->>'max_discount_amount')::decimal;
                    END IF;
                ELSE
                    v_discount := (v_promo_result->>'discount_value')::decimal;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'create_order promo_eval_failed code=% error=%', COALESCE(p_promo_code, 'null'), SQLERRM;
            v_discount := 0;
        END;
    END IF;

    -- 7. Shipping calculation
    IF (v_total_subtotal + v_total_vat - v_discount) >= v_shipping_threshold THEN
        v_shipping_cost := 0;
    END IF;

    -- 8. Final Total
    v_final_total := v_total_subtotal + v_total_vat + v_shipping_cost - v_discount;
    IF v_final_total < 0 THEN
        v_final_total := 0;
    END IF;

    v_item_total_cents := ROUND(v_total_subtotal * 100)::bigint;
    v_vat_total_cents := ROUND(v_total_vat * 100)::bigint;
    v_shipping_total_cents := ROUND(v_shipping_cost * 100)::bigint;
    v_discount_total_cents := ROUND(v_discount * 100)::bigint;
    v_paid_total_cents := ROUND(v_final_total * 100)::bigint;

    RAISE LOG 'create_order totals subtotal=%, vat=%, shipping=%, discount=%, final_total=%',
        v_total_subtotal,
        v_total_vat,
        v_shipping_cost,
        v_discount,
        v_final_total;

    -- Bank Reference
    RAISE LOG 'create_order about_to_generate_bank_ref using pg_catalog.now()';
    v_bank_ref := 'BRV-' || to_char(pg_catalog.now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    RAISE LOG 'create_order bank_ref_generated=%', v_bank_ref;

    -- 9. Construct final order_details JSON
    v_order_details := jsonb_build_object(
        'items', v_valid_items,
        'subtotal', v_total_subtotal,
        'vat_rate', v_vat_rate,
        'vat_amount', v_total_vat,
        'shipping_cost', v_shipping_cost,
        'total', v_final_total,
        'promo_code', p_promo_code,
        'discount', v_discount,
        'bank_reference', v_bank_ref
    );

    -- 10. Insert Order
    RAISE LOG 'create_order inserting_order user_id=%, paid_total_cents=%, bank_ref=%',
        COALESCE(v_user_id::text, 'null'),
        v_paid_total_cents,
        COALESCE(v_bank_ref, 'null');

    INSERT INTO public.orders (
        user_id,
        shipping_address_id,
        payment_method,
        status,
        payment_status,
        order_details,
        currency,
        installment_number,
        item_total_cents,
        vat_total_cents,
        shipping_total_cents,
        discount_total_cents,
        commission_amount_cents,
        paid_total_cents,
        promo_code,
        bank_reference
    ) VALUES (
        v_user_id,
        p_shipping_address_id,
        'bank_transfer',
        'pending',
        'pending',
        v_order_details,
        'TL',
        1,
        v_item_total_cents,
        v_vat_total_cents,
        v_shipping_total_cents,
        v_discount_total_cents,
        0,
        v_paid_total_cents,
        p_promo_code,
        v_bank_ref
    ) RETURNING id INTO v_order_id;

    -- 11. Insert Status History
    BEGIN
        INSERT INTO public.order_status_history (order_id, status, note, created_at)
        VALUES (
            v_order_id,
            'pending',
            'Sipariş alındı (Havale/EFT Bekleniyor)',
            pg_catalog.now()
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'create_order status_history_insert_failed order_id=% error=%', COALESCE(v_order_id::text, 'null'), SQLERRM;
        NULL;
    END;

    RAISE LOG 'create_order success order_id=% bank_ref=%', COALESCE(v_order_id::text, 'null'), COALESCE(v_bank_ref, 'null');

    -- 12. Return Success
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'total', v_final_total,
        'shipping_cost', v_shipping_cost,
        'bank_reference', v_bank_ref,
        'message', 'Sipariş başarıyla oluşturuldu'
    );
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
        v_sqlstate = RETURNED_SQLSTATE,
        v_errmsg = MESSAGE_TEXT,
        v_errdetail = PG_EXCEPTION_DETAIL,
        v_errhint = PG_EXCEPTION_HINT,
        v_errcontext = PG_EXCEPTION_CONTEXT;

    RAISE LOG 'create_order failed user=%, payment_method=%, sqlstate=%, errmsg=%, detail=%, hint=%, context=%',
        COALESCE(v_user_id::text, 'anonymous'),
        COALESCE(p_payment_method, 'unknown'),
        COALESCE(v_sqlstate, 'null'),
        COALESCE(v_errmsg, 'null'),
        COALESCE(v_errdetail, 'null'),
        COALESCE(v_errhint, 'null'),
        COALESCE(v_errcontext, 'null');

    RETURN jsonb_build_object(
        'success', false,
        'message', 'Sipariş oluşturulurken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'
    );
END;
$function$
;

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
$function$
;

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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND (is_admin = true OR is_superadmin = true)
    );
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.is_superadmin_user()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_superadmin = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.prune_expired_otp_codes()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$function$
;

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
$function$
;



