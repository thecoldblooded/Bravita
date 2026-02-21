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
    RAISE LOG 'create_order about_to_generate_bank_ref using public.now()';
    v_bank_ref := 'BRV-' || to_char(public.now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
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
            public.now()
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
$function$;;
