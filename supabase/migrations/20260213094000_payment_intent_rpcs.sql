-- RPCs for payment intent lifecycle

BEGIN;
CREATE OR REPLACE FUNCTION public.calculate_order_quote_v1(
    p_user_id UUID,
    p_items JSONB,
    p_shipping_address_id UUID,
    p_payment_method TEXT DEFAULT 'credit_card',
    p_installment_number INTEGER DEFAULT 1,
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
    v_role := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
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
$$;
CREATE OR REPLACE FUNCTION public.reserve_stock_for_intent_v1(
    p_intent_id UUID,
    p_ttl_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_role TEXT;
    v_intent RECORD;
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_stock INTEGER;
    v_reserved INTEGER;
    v_available INTEGER;
    v_reserve_until TIMESTAMPTZ;
    v_existing RECORD;
    v_reserved_count INTEGER := 0;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
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

    IF v_intent.status NOT IN ('pending', 'awaiting_3d') THEN
        RAISE EXCEPTION 'intent_status_invalid';
    END IF;

    v_reserve_until := NOW() + make_interval(mins => GREATEST(p_ttl_minutes, 1));

    -- release previously active reservations for same intent, then recreate deterministically
    FOR v_existing IN
        SELECT product_id, qty
        FROM public.stock_reservations
        WHERE intent_id = p_intent_id
          AND released_at IS NULL
    LOOP
        UPDATE public.products
        SET reserved_stock = GREATEST(COALESCE(reserved_stock, 0) - v_existing.qty, 0)
        WHERE id = v_existing.product_id;
    END LOOP;

    UPDATE public.stock_reservations
    SET released_at = NOW()
    WHERE intent_id = p_intent_id
      AND released_at IS NULL;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_intent.cart_snapshot)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := COALESCE((v_item->>'quantity')::integer, 0);

        IF v_product_id IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'intent_cart_invalid';
        END IF;

        SELECT stock, COALESCE(reserved_stock, 0)
        INTO v_stock, v_reserved
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'product_not_found';
        END IF;

        v_available := v_stock - v_reserved;
        IF v_available < v_qty THEN
            RAISE EXCEPTION 'insufficient_stock';
        END IF;

        INSERT INTO public.stock_reservations (intent_id, product_id, qty, expires_at)
        VALUES (p_intent_id, v_product_id, v_qty, v_reserve_until);

        UPDATE public.products
        SET reserved_stock = COALESCE(reserved_stock, 0) + v_qty
        WHERE id = v_product_id;

        v_reserved_count := v_reserved_count + 1;
    END LOOP;

    UPDATE public.payment_intents
    SET status = 'awaiting_3d',
        expires_at = v_reserve_until,
        updated_at = NOW()
    WHERE id = p_intent_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'intent_id', p_intent_id,
        'reserved_count', v_reserved_count,
        'expires_at', v_reserve_until
    );
END;
$$;
CREATE OR REPLACE FUNCTION public.release_intent_reservations_v1(
    p_intent_id UUID,
    p_new_status TEXT DEFAULT 'failed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_role TEXT;
    v_reservation RECORD;
    v_released_count INTEGER := 0;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
    IF v_role <> 'service_role' THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    FOR v_reservation IN
        SELECT id, product_id, qty
        FROM public.stock_reservations
        WHERE intent_id = p_intent_id
          AND released_at IS NULL
        FOR UPDATE
    LOOP
        UPDATE public.products
        SET reserved_stock = GREATEST(COALESCE(reserved_stock, 0) - v_reservation.qty, 0)
        WHERE id = v_reservation.product_id;

        UPDATE public.stock_reservations
        SET released_at = NOW()
        WHERE id = v_reservation.id;

        v_released_count := v_released_count + 1;
    END LOOP;

    IF p_new_status IN ('failed', 'expired') THEN
        UPDATE public.payment_intents
        SET status = p_new_status,
            updated_at = NOW()
        WHERE id = p_intent_id
          AND status NOT IN ('paid', 'voided', 'refunded');
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'intent_id', p_intent_id,
        'released_count', v_released_count
    );
END;
$$;
CREATE OR REPLACE FUNCTION public.finalize_intent_create_order_v1(
    p_intent_id UUID,
    p_gateway_result JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
    v_role := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
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
$$;
CREATE OR REPLACE FUNCTION public.release_expired_reservations_v1()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_role TEXT;
    v_reservation RECORD;
    v_released_count INTEGER := 0;
    v_expired_intent_count INTEGER := 0;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
    IF v_role <> 'service_role' THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    FOR v_reservation IN
        SELECT id, intent_id, product_id, qty
        FROM public.stock_reservations
        WHERE released_at IS NULL
          AND expires_at < NOW()
        FOR UPDATE
    LOOP
        UPDATE public.products
        SET reserved_stock = GREATEST(COALESCE(reserved_stock, 0) - v_reservation.qty, 0)
        WHERE id = v_reservation.product_id;

        UPDATE public.stock_reservations
        SET released_at = NOW()
        WHERE id = v_reservation.id;

        v_released_count := v_released_count + 1;
    END LOOP;

    UPDATE public.payment_intents
    SET status = 'expired',
        updated_at = NOW()
    WHERE status IN ('pending', 'awaiting_3d')
      AND expires_at < NOW();

    GET DIAGNOSTICS v_expired_intent_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', TRUE,
        'released_reservation_count', v_released_count,
        'expired_intent_count', v_expired_intent_count
    );
END;
$$;
CREATE OR REPLACE FUNCTION public.expire_abandoned_intents_v1()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_role TEXT;
    v_expired_count INTEGER := 0;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
    IF v_role <> 'service_role' THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    UPDATE public.payment_intents pi
    SET status = 'expired',
        updated_at = NOW()
    WHERE pi.status IN ('pending', 'awaiting_3d')
      AND pi.expires_at < NOW()
      AND NOT EXISTS (
            SELECT 1
            FROM public.stock_reservations sr
            WHERE sr.intent_id = pi.id
              AND sr.released_at IS NULL
      );

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', TRUE,
        'expired_intent_count', v_expired_count
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_order_quote_v1(UUID, JSONB, UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_stock_for_intent_v1(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_intent_reservations_v1(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_intent_create_order_v1(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations_v1() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_abandoned_intents_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_order_quote_v1(UUID, JSONB, UUID, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_intent_v1(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_intent_reservations_v1(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_intent_create_order_v1(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_abandoned_intents_v1() TO service_role;
COMMIT;
