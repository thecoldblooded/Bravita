-- Align admin cancellation flow with payment-intent source of truth.
-- Credit-card orders must not be marked refunded by status transition alone.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status TEXT;
    v_order_details JSONB;
    v_payment_status TEXT;
    v_payment_method TEXT;
    v_payment_intent_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Admin check
    IF NOT public.is_admin_user() THEN
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
                NULL;
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
                BEGIN
                    PERFORM public.restore_stock(v_item.product_id, v_item.quantity);
                EXCEPTION WHEN OTHERS THEN
                    UPDATE public.products
                    SET stock = stock + v_item.quantity,
                        updated_at = NOW()
                    WHERE id = v_item.product_id;
                END;
            END IF;
        END LOOP;

        -- Update reason
        UPDATE public.orders SET cancellation_reason = p_note WHERE id = p_order_id;
    END IF;

    -- 5. Delivery Logic
    IF p_new_status = 'delivered' AND v_old_status != 'delivered' THEN
        FOR v_item IN
            SELECT *
            FROM jsonb_to_recordset(v_order_details->'items') AS x(product_id UUID, quantity INTEGER)
        LOOP
            IF v_item.product_id IS NOT NULL THEN
                BEGIN
                    PERFORM public.finalize_reservation(v_item.product_id, v_item.quantity);
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END LOOP;
    END IF;

    -- 6. Update Order
    UPDATE public.orders
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_order_id;

    -- 7. Insert into Order Status History
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
        INSERT INTO public.order_status_history (order_id, status, note, created_by)
        VALUES (p_order_id, p_new_status, p_note, auth.uid());
    END IF;

    -- 8. Insert into Admin Audit Log
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

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

COMMIT;
