CREATE OR REPLACE FUNCTION public.manage_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    item jsonb;
    qty int;
    prod_id uuid;
    target_pid uuid;
    old_status text;
    new_status text;
    is_new_active boolean;
    is_old_active boolean;
    is_new_delivered boolean;
    is_old_delivered boolean;
    is_new_cancelled boolean;
    is_old_cancelled boolean;
    v_rows_affected int;
BEGIN
    IF TG_OP = 'INSERT' THEN
        old_status := NULL;
        new_status := NEW.status;
    ELSE
        old_status := OLD.status;
        new_status := NEW.status;
    END IF;

    is_new_active := lower(coalesce(new_status, '')) IN ('pending', 'processing', 'preparing', 'shipped', 'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    is_old_active := lower(coalesce(old_status, '')) IN ('pending', 'processing', 'preparing', 'shipped', 'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    is_new_delivered := lower(coalesce(new_status, '')) IN ('delivered', 'teslim edildi');
    is_old_delivered := lower(coalesce(old_status, '')) IN ('delivered', 'teslim edildi');
    is_new_cancelled := lower(coalesce(new_status, '')) IN ('cancelled', 'iptal edildi', 'iade edildi');
    is_old_cancelled := lower(coalesce(old_status, '')) IN ('cancelled', 'iptal edildi', 'iade edildi');

    -- Special logic for credit card orders (their active stock/reservation is managed by finalize_intent)
    IF NEW.payment_method = 'credit_card' THEN
        -- We only need to return items to stock if an active credit card order is cancelled
        IF TG_OP = 'UPDATE' AND is_old_active AND is_new_cancelled AND new_status IS DISTINCT FROM old_status THEN
            IF NEW.order_details->'items' IS NOT NULL THEN
                FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
                LOOP
                    qty := (item->>'quantity')::int;
                    prod_id := (item->>'product_id')::uuid;
                    UPDATE public.products
                       SET stock = stock + qty
                     WHERE id = prod_id;
                END LOOP;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- Logic for bank transfer orders
    IF NEW.order_details->'items' IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
        LOOP
            qty := (item->>'quantity')::int;
            prod_id := (item->>'product_id')::uuid;

            IF qty IS NULL OR qty <= 0 THEN
                RAISE EXCEPTION 'Invalid quantity in order item';
            END IF;

            SELECT id
              INTO target_pid
              FROM public.products
             WHERE id = prod_id
             FOR UPDATE;

            IF target_pid IS NULL THEN
                RAISE EXCEPTION 'Product not found: %', prod_id;
            END IF;

            IF TG_OP = 'INSERT' THEN
                IF is_new_active THEN
                    -- On creation of pending bank transfer, we only reserve the stock
                    UPDATE public.products
                       SET reserved_stock = COALESCE(reserved_stock, 0) + qty
                     WHERE id = target_pid;
                ELSIF is_new_delivered THEN
                    -- Direct delivery: decrement actual stock
                    UPDATE public.products
                       SET stock = stock - qty
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                END IF;
            ELSIF TG_OP = 'UPDATE' AND new_status IS DISTINCT FROM old_status THEN
                IF is_old_active AND is_new_delivered THEN
                    -- Payment approved / shipped to delivered: decrement actual stock and release reservation
                    UPDATE public.products
                       SET stock = stock - qty,
                           reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty)
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                ELSIF is_old_active AND is_new_cancelled THEN
                    -- Cancel pending order: release reservation only (stock was never decremented)
                    UPDATE public.products
                       SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty)
                     WHERE id = target_pid;
                ELSIF is_old_delivered AND is_new_cancelled THEN
                    -- Return delivered order back to stock
                    UPDATE public.products
                       SET stock = stock + qty
                     WHERE id = target_pid;
                ELSIF is_old_cancelled AND is_new_active THEN
                    -- Re-reserve previously cancelled order
                    UPDATE public.products
                       SET reserved_stock = COALESCE(reserved_stock, 0) + qty
                     WHERE id = target_pid;
                ELSIF is_old_cancelled AND is_new_delivered THEN
                    -- Deliver previously cancelled order: decrement stock
                    UPDATE public.products
                       SET stock = stock - qty
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;
