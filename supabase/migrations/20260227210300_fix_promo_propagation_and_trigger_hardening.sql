CREATE OR REPLACE FUNCTION public.finalize_intent_create_order_v1(p_intent_id uuid, p_gateway_result jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_role TEXT;
    v_intent RECORD;
    v_profile_complete BOOLEAN;
    v_phone TEXT;
    v_existing_order_id UUID;
    v_reservation RECORD;
    v_product RECORD;
    v_order_id UUID;
    v_gateway_status TEXT;
    v_gateway_trx_code TEXT;
    v_order_details JSONB;
    v_history_note TEXT;
    v_active_reservation_count INTEGER := 0;
    v_intent_promo_code TEXT;
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

    SELECT profile_complete, phone
    INTO v_profile_complete, v_phone
    FROM public.profiles
    WHERE id = v_intent.user_id;

    IF v_profile_complete IS NULL OR v_profile_complete = false THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'PROFILE_INCOMPLETE',
            'message', 'Sipariş vermek için profilinizi tamamlamanız gerekiyor'
        );
    END IF;

    IF v_phone IS NULL OR length(regexp_replace(v_phone, '\\D', '', 'g')) < 10 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'PHONE_REQUIRED',
            'message', 'Sipariş vermek için geçerli bir telefon numarası gereklidir'
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

    v_intent_promo_code := NULLIF(
        BTRIM(
            COALESCE(
                v_intent.pricing_snapshot->>'promo_code',
                v_intent.pricing_snapshot->>'promoCode',
                v_intent.pricing_snapshot->'pricing'->>'promo_code',
                v_intent.pricing_snapshot->'pricing'->>'promoCode'
            )
        ),
        ''
    );

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
        'promo_code', v_intent_promo_code,
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
        paid_total_cents,
        promo_code
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
        v_intent.paid_total_cents,
        v_intent_promo_code
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_order_promo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_code text;
  v_discount numeric := 0;
  v_promo_id uuid;
  v_inserted_count integer := 0;
BEGIN
  v_code := NULLIF(
    BTRIM(
      COALESCE(
        NEW.order_details->>'promo_code',
        NEW.promo_code
      )
    ),
    ''
  );

  BEGIN
    IF NEW.order_details ? 'discount' THEN
      v_discount := COALESCE((NEW.order_details->>'discount')::numeric, 0);
    ELSIF NEW.discount_total_cents IS NOT NULL THEN
      v_discount := ROUND(NEW.discount_total_cents::numeric / 100, 2);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_discount := 0;
  END;

  IF v_code IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_promo_id
  FROM public.promo_codes
  WHERE code ILIKE v_code
  FOR UPDATE;

  IF v_promo_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.promo_logs (promo_code_id, order_id, user_id, discount_amount)
  SELECT v_promo_id, NEW.id, NEW.user_id, COALESCE(v_discount, 0)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.promo_logs pl
    WHERE pl.promo_code_id = v_promo_id
      AND pl.order_id = NEW.id
  );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    UPDATE public.promo_codes
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = v_promo_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_handle_promo_usage ON public.orders;
CREATE TRIGGER trigger_handle_promo_usage
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_order_promo();
