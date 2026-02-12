
CREATE OR REPLACE FUNCTION create_order(
    p_items JSONB,
    p_shipping_address_id UUID,
    p_payment_method TEXT,
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    v_final_total DECIMAL(10,2);
    v_discount DECIMAL(10,2) := 0;
    v_order_id UUID;
    v_valid_items JSONB := '[]'::JSONB;
    v_item_detail JSONB;
    v_order_details JSONB;
    v_bank_ref TEXT := NULL;
    v_address_owner UUID;
    v_promo_result JSON;
    v_settings_vat DECIMAL(10,2);
    v_settings_shipping DECIMAL(10,2);
    v_settings_threshold DECIMAL(10,2);
BEGIN
    -- 0. Get Settings
    SELECT vat_rate, shipping_cost, free_shipping_threshold 
    INTO v_settings_vat, v_settings_shipping, v_settings_threshold
    FROM public.site_settings WHERE id = 1;

    -- 1. Get User ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Oturum açmanız gerekiyor');
    END IF;

    -- 2. Address Ownership Check (IDOR Security Fix)
    SELECT user_id INTO v_address_owner FROM addresses WHERE id = p_shipping_address_id;
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
        FROM products 
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
        
        -- Update stock
        UPDATE products SET stock = stock - v_qty WHERE id = v_product_id;
        
    END LOOP;

    -- 4. VAT 
    v_total_vat := v_total_subtotal * v_settings_vat;

    -- 5. Shipping
    IF (v_total_subtotal + v_total_vat) >= v_settings_threshold THEN
        v_shipping_cost := 0;
    ELSE
        v_shipping_cost := v_settings_shipping;
    END IF;

    -- 6. Promo Code
    IF p_promo_code IS NOT NULL THEN
        -- Placeholder for promo logic
    END IF;

    -- 7. Calculate Final Total
    v_final_total := v_total_subtotal + v_total_vat + v_shipping_cost;

    -- 8. Create Order
    v_order_details := jsonb_build_object(
        'items', v_valid_items,
        'subtotal', v_total_subtotal,
        'vat_amount', v_total_vat,
        'total', v_final_total,
        'shipping_cost', v_shipping_cost
    );

    INSERT INTO orders (
        user_id,
        order_details,
        status,
        payment_method,
        shipping_address_id,
        payment_status
    ) VALUES (
        v_user_id,
        v_order_details,
        'pending',
        p_payment_method,
        p_shipping_address_id,
        'pending'
    ) RETURNING id INTO v_order_id;

    RETURN jsonb_build_object(
        'success', true, 
        'orderId', v_order_id,
        'subtotal', v_total_subtotal,
        'vat', v_total_vat,
        'total', v_final_total,
        'shipping_cost', v_shipping_cost,
        'message', 'Sipariş başarıyla oluşturuldu'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Bir hata oluştu: ' || SQLERRM
    );
END;
$$;
;
