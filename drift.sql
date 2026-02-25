drop policy "Allow public read access to installment rates" on "public"."installment_rates";

alter table "public"."site_settings" alter column "vat_rate" set default 0.20;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_order_quote_v1(p_user_id uuid, p_items jsonb, p_shipping_address_id uuid, p_payment_method text DEFAULT 'credit_card'::text, p_installment_number integer DEFAULT 1, p_promo_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_role TEXT;
    v_user_id UUID;
    v_address_owner UUID;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_product_price NUMERIC(12,2);
    v_product_stock INTEGER;
    v_reserved_stock INTEGER;
    v_available_stock INTEGER;
    v_qty INTEGER;
    v_item_unit_cents BIGINT;
    v_item_line_cents BIGINT;
    v_item_total_cents BIGINT := 0;
    v_vat_rate NUMERIC(10,4) := 0.20;
    v_shipping_cost NUMERIC(10,2) := 49.90;
    v_shipping_threshold NUMERIC(12,2) := 1500.00;
    v_vat_total_cents BIGINT := 0;
    v_shipping_total_cents BIGINT := 0;
    v_discount_total_cents BIGINT := 0;
    v_pre_shipping_total_cents BIGINT := 0;
    v_base_total_cents BIGINT := 0;
    v_commission_rate NUMERIC(5,2) := 0;
    v_commission_amount_cents BIGINT := 0;
    v_paid_total_cents BIGINT := 0;
    v_rate_updated_at TIMESTAMPTZ;
    v_promo_result JSON;
    v_cart_snapshot JSONB := '[]'::jsonb;
BEGIN
    v_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', TRUE), ''), auth.role(), 'service_role');
    IF v_role = 'service_role' THEN
        v_user_id := p_user_id;
    ELSE
        v_user_id := auth.uid();
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Oturum gerekli');
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Sepet bos olamaz');
    END IF;

    SELECT user_id
    INTO v_address_owner
    FROM public.addresses
    WHERE id = p_shipping_address_id;

    IF v_address_owner IS NULL OR v_address_owner <> v_user_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Gecersiz adres secimi');
    END IF;

    IF p_payment_method NOT IN ('credit_card', 'bank_transfer') THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Gecersiz odeme yontemi');
    END IF;

    IF p_payment_method = 'credit_card' AND (p_installment_number < 1 OR p_installment_number > 12) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Gecersiz taksit sayisi');
    END IF;

    SELECT
        COALESCE(vat_rate, 0.20),
        COALESCE(shipping_cost, 49.90),
        COALESCE(free_shipping_threshold, 1500.00)
    INTO v_vat_rate, v_shipping_cost, v_shipping_threshold
    FROM public.site_settings
    WHERE id = 1;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := COALESCE((v_item->>'quantity')::integer, 0);

        IF v_product_id IS NULL OR v_qty <= 0 THEN
            RETURN jsonb_build_object('success', FALSE, 'message', 'Sepet ogesi gecersiz');
        END IF;

        SELECT
            p.name,
            p.price,
            p.stock,
            COALESCE(p.reserved_stock, 0)
        INTO
            v_product_name,
            v_product_price,
            v_product_stock,
            v_reserved_stock
        FROM public.products p
        WHERE p.id = v_product_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', FALSE, 'message', 'Urun bulunamadi');
        END IF;

        v_available_stock := v_product_stock - v_reserved_stock;
        IF v_available_stock < v_qty THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message', 'Yetersiz stok',
                'product_id', v_product_id
            );
        END IF;

        v_item_unit_cents := ROUND(v_product_price * 100)::bigint;
        v_item_line_cents := v_item_unit_cents * v_qty;
        v_item_total_cents := v_item_total_cents + v_item_line_cents;

        v_cart_snapshot := v_cart_snapshot || jsonb_build_array(
            jsonb_build_object(
                'product_id', v_product_id,
                'product_name', v_product_name,
                'quantity', v_qty,
                'unit_price_cents', v_item_unit_cents,
                'unit_price', ROUND(v_item_unit_cents::numeric / 100, 2),
                'subtotal_cents', v_item_line_cents,
                'subtotal', ROUND(v_item_line_cents::numeric / 100, 2),
                'line_total_cents', v_item_line_cents,
                'line_total', ROUND(v_item_line_cents::numeric / 100, 2)
            )
        );
    END LOOP;

    v_vat_total_cents := ROUND(v_item_total_cents * v_vat_rate)::bigint;

    IF p_promo_code IS NOT NULL AND LENGTH(TRIM(p_promo_code)) > 0 THEN
        BEGIN
            SELECT verify_promo_code(p_promo_code) INTO v_promo_result;
            IF COALESCE((v_promo_result->>'valid')::boolean, FALSE) THEN
                IF (v_promo_result->>'discount_type') = 'percentage' THEN
                    v_discount_total_cents := ROUND(
                        (v_item_total_cents + v_vat_total_cents) *
                        (COALESCE((v_promo_result->>'discount_value')::numeric, 0) / 100.0)
                    )::bigint;
                ELSE
                    v_discount_total_cents := ROUND(
                        COALESCE((v_promo_result->>'discount_value')::numeric, 0) * 100
                    )::bigint;
                END IF;

                IF (v_promo_result->>'max_discount_amount') IS NOT NULL THEN
                    v_discount_total_cents := LEAST(
                        v_discount_total_cents,
                        ROUND((v_promo_result->>'max_discount_amount')::numeric * 100)::bigint
                    );
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_discount_total_cents := 0;
        END;
    END IF;

    v_pre_shipping_total_cents := GREATEST(v_item_total_cents + v_vat_total_cents - v_discount_total_cents, 0);
    IF v_pre_shipping_total_cents >= ROUND(v_shipping_threshold * 100)::bigint THEN
        v_shipping_total_cents := 0;
    ELSE
        v_shipping_total_cents := ROUND(v_shipping_cost * 100)::bigint;
    END IF;

    v_base_total_cents := v_pre_shipping_total_cents + v_shipping_total_cents;

    IF p_payment_method = 'credit_card' THEN
        SELECT commission_rate, updated_at
        INTO v_commission_rate, v_rate_updated_at
        FROM public.installment_rates
        WHERE installment_number = p_installment_number
          AND is_active = TRUE
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', FALSE, 'message', 'Secilen taksit aktif degil');
        END IF;

        v_commission_amount_cents := ROUND(v_base_total_cents * (v_commission_rate / 100.0))::bigint;
    ELSE
        v_commission_rate := 0;
        v_rate_updated_at := NOW();
        v_commission_amount_cents := 0;
    END IF;

    v_paid_total_cents := v_base_total_cents + v_commission_amount_cents;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Quote olusturuldu',
        'payment_method', p_payment_method,
        'shipping_address_id', p_shipping_address_id,
        'installment_number', CASE WHEN p_payment_method = 'credit_card' THEN p_installment_number ELSE 1 END,
        'item_total_cents', v_item_total_cents,
        'vat_total_cents', v_vat_total_cents,
        'shipping_total_cents', v_shipping_total_cents,
        'discount_total_cents', v_discount_total_cents,
        'base_total_cents', v_base_total_cents,
        'commission_rate', v_commission_rate,
        'commission_amount_cents', v_commission_amount_cents,
        'paid_total_cents', v_paid_total_cents,
        'currency', 'TL',
        'rate_version', 'v1',
        'effective_from', v_rate_updated_at,
        'cart_snapshot', v_cart_snapshot
    );
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
BEGIN
    -- Card flow must use payment_intent + 3D finalize path
    IF p_payment_method <> 'bank_transfer' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Kart odemeleri yeni 3D akisi ile alinmaktadir. Lutfen kart odeme endpointini kullanin.'
        );
    END IF;
    -- 1. Get User ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Oturum açmanız gerekiyor');
    END IF;
    -- 2. Address Ownership Check (IDOR Security Fix)
    SELECT user_id INTO v_address_owner FROM public.addresses WHERE id = p_shipping_address_id;
    IF v_address_owner IS NULL OR v_address_owner != v_user_id THEN
         RETURN jsonb_build_object('success', false, 'message', 'Geçersiz adres seçimi: Adres size ait değil.');
    END IF;
    -- 3. Iterate input items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;
        -- Negative Quantity Check (Logic Security Fix)
        IF v_qty <= 0 THEN
             RETURN jsonb_build_object('success', false, 'message', 'Geçersiz ürün miktarı: 0 veya negatif olamaz.');
        END IF;
        -- Get product from DB WITH LOCK (Race Condition Fix)
        SELECT id, name, price, stock 
        INTO v_product_id, v_product_name, v_product_price, v_product_stock
        FROM public.products 
        WHERE id = v_product_id
        FOR UPDATE; -- Critical: Locks the row
        
        IF NOT FOUND THEN
             RETURN jsonb_build_object('success', false, 'message', 'Ürün bulunamadı: ID ' || v_product_id);
        END IF;
        -- Check stock validity
        IF v_product_stock < v_qty THEN
             RETURN jsonb_build_object('success', false, 'message', 'Yetersiz stok: ' || v_product_name);
        END IF;
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
            -- Attempt to call verify_promo_code
            SELECT public.verify_promo_code(p_promo_code) INTO v_promo_result;
            
            IF (v_promo_result->>'valid')::boolean = true THEN
                -- Check min order amount logic if applicable
                 IF (v_promo_result->>'discount_type') = 'percentage' THEN
                     v_discount := (v_total_subtotal + v_total_vat) * ((v_promo_result->>'discount_value')::decimal / 100);
                     -- Max discount check
                     IF (v_promo_result->>'max_discount_amount') IS NOT NULL AND v_discount > (v_promo_result->>'max_discount_amount')::decimal THEN
                         v_discount := (v_promo_result->>'max_discount_amount')::decimal;
                     END IF;
                 ELSE
                     v_discount := (v_promo_result->>'discount_value')::decimal;
                 END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_discount := 0;
        END;
    END IF;
    -- 7. Shipping calculation
    IF (v_total_subtotal + v_total_vat - v_discount) >= v_shipping_threshold THEN
        v_shipping_cost := 0;
    END IF;
    -- 8. Final Total
    v_final_total := v_total_subtotal + v_total_vat + v_shipping_cost - v_discount;
    IF v_final_total < 0 THEN v_final_total := 0; END IF;
    v_item_total_cents := ROUND(v_total_subtotal * 100)::bigint;
    v_vat_total_cents := ROUND(v_total_vat * 100)::bigint;
    v_shipping_total_cents := ROUND(v_shipping_cost * 100)::bigint;
    v_discount_total_cents := ROUND(v_discount * 100)::bigint;
    v_paid_total_cents := ROUND(v_final_total * 100)::bigint;
    -- Bank Reference
    v_bank_ref := 'BRV-' || to_char(public.now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
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
            public.now()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
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
    RAISE LOG 'create_order failed for user %, payment_method %, error %',
        COALESCE(v_user_id::text, 'anonymous'),
        COALESCE(p_payment_method, 'unknown'),
        SQLERRM;
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Sipariş oluşturulurken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.finalize_intent_create_order_v1(p_intent_id uuid, p_gateway_result jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_role TEXT;
    v_intent RECORD;
    v_existing_order_id UUID;
    v_reservation RECORD;
    v_product RECORD;
    v_order_id UUID;
    v_gateway_status TEXT;
    v_gateway_trx_code TEXT;
    v_order_details JSONB;
    v_history_note TEXT;
    v_active_reservation_count INTEGER := 0;
BEGIN
    v_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', TRUE), ''), auth.role(), 'service_role');
    IF v_role <> 'service_role' THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    SELECT *
    INTO v_intent
    FROM public.payment_intents
    WHERE id = p_intent_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'intent_not_found';
    END IF;

    IF v_intent.status = 'paid' THEN
        SELECT id
        INTO v_existing_order_id
        FROM public.orders
        WHERE payment_intent_id = p_intent_id
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', TRUE,
            'order_id', v_existing_order_id,
            'already_paid', TRUE
        );
    END IF;

    IF v_intent.status NOT IN ('pending', 'awaiting_3d') THEN
        RAISE EXCEPTION 'intent_status_invalid';
    END IF;

    IF v_intent.currency <> 'TL' THEN
        RAISE EXCEPTION 'currency_mismatch';
    END IF;

    SELECT COUNT(*)
    INTO v_active_reservation_count
    FROM public.stock_reservations
    WHERE intent_id = p_intent_id
      AND released_at IS NULL;

    IF v_active_reservation_count = 0 THEN
        RAISE EXCEPTION 'no_active_reservations';
    END IF;

    FOR v_reservation IN
        SELECT id, product_id, qty
        FROM public.stock_reservations
        WHERE intent_id = p_intent_id
          AND released_at IS NULL
        FOR UPDATE
    LOOP
        SELECT id, stock, COALESCE(reserved_stock, 0) AS reserved_stock
        INTO v_product
        FROM public.products
        WHERE id = v_reservation.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'product_not_found';
        END IF;

        IF v_product.reserved_stock < v_reservation.qty OR v_product.stock < v_reservation.qty THEN
            RAISE EXCEPTION 'reservation_state_invalid';
        END IF;

        UPDATE public.products
        SET
            stock = stock - v_reservation.qty,
            reserved_stock = GREATEST(COALESCE(reserved_stock, 0) - v_reservation.qty, 0)
        WHERE id = v_reservation.product_id;
    END LOOP;

    v_order_details := jsonb_build_object(
        'items', v_intent.cart_snapshot,
        'subtotal', ROUND(v_intent.item_total_cents::numeric / 100, 2),
        'vat_amount', ROUND(v_intent.vat_total_cents::numeric / 100, 2),
        'shipping_cost', ROUND(v_intent.shipping_total_cents::numeric / 100, 2),
        'discount', ROUND(v_intent.discount_total_cents::numeric / 100, 2),
        'commission_amount', ROUND(v_intent.commission_amount_cents::numeric / 100, 2),
        'total', ROUND(v_intent.paid_total_cents::numeric / 100, 2),
        'currency', 'TL',
        'installment_number', v_intent.installment_number
    );

    INSERT INTO public.orders (
        user_id,
        shipping_address_id,
        payment_method,
        payment_status,
        status,
        order_details,
        payment_intent_id,
        currency,
        installment_number,
        item_total_cents,
        vat_total_cents,
        shipping_total_cents,
        discount_total_cents,
        commission_amount_cents,
        paid_total_cents
    )
    VALUES (
        v_intent.user_id,
        v_intent.shipping_address_id,
        'credit_card',
        'paid',
        'processing',
        v_order_details,
        v_intent.id,
        'TL',
        v_intent.installment_number,
        v_intent.item_total_cents,
        v_intent.vat_total_cents,
        v_intent.shipping_total_cents,
        v_intent.discount_total_cents,
        v_intent.commission_amount_cents,
        v_intent.paid_total_cents
    )
    RETURNING id INTO v_order_id;

    v_history_note := 'Kart odemesi onaylandi ve siparis olusturuldu';
    INSERT INTO public.order_status_history (order_id, status, note, created_at)
    VALUES (v_order_id, 'processing', v_history_note, NOW());

    UPDATE public.stock_reservations
    SET released_at = NOW()
    WHERE intent_id = p_intent_id
      AND released_at IS NULL;

    v_gateway_status := COALESCE(
        p_gateway_result->>'gateway_status',
        p_gateway_result->>'resultCode',
        p_gateway_result->>'result_code',
        'success'
    );
    v_gateway_trx_code := COALESCE(
        p_gateway_result->>'gateway_trx_code',
        p_gateway_result->>'trxCode',
        p_gateway_result->>'trx_code',
        v_intent.gateway_trx_code
    );

    UPDATE public.payment_intents
    SET
        status = 'paid',
        gateway_status = v_gateway_status,
        gateway_trx_code = v_gateway_trx_code,
        updated_at = NOW()
    WHERE id = p_intent_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'already_paid', FALSE
    );
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


  create policy "Users read installment rates"
  on "public"."installment_rates"
  as permissive
  for select
  to authenticated
using (true);




