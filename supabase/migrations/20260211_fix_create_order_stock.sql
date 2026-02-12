CREATE OR REPLACE FUNCTION create_order(
    p_items JSONB, -- Array of objects: [{"product_id": "uuid", "quantity": 1}]
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
    v_promo_result JSONB;
    v_settings_vat DECIMAL(10,2);
    v_settings_shipping DECIMAL(10,2);
    v_settings_threshold DECIMAL(10,2);
    v_gross_total DECIMAL(10,2);
    v_initial_status TEXT;
    v_initial_payment_status TEXT;
BEGIN
    -- 0. Get Settings
    SELECT vat_rate, shipping_cost, free_shipping_threshold 
    INTO v_settings_vat, v_settings_shipping, v_settings_threshold
    FROM public.site_settings WHERE id = 1;

    -- Fallback if settings are missing
    IF v_settings_vat IS NULL THEN v_settings_vat := 0.20; END IF;
    IF v_settings_shipping IS NULL THEN v_settings_shipping := 49.90; END IF;
    IF v_settings_threshold IS NULL THEN v_settings_threshold := 1500.00; END IF;

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
        
    END LOOP;

    -- 4. VAT 
    v_total_vat := v_total_subtotal * v_settings_vat;
    v_gross_total := v_total_subtotal + v_total_vat;

    -- 5. Shipping
    IF v_gross_total >= v_settings_threshold THEN
        v_shipping_cost := 0;
    ELSE
        v_shipping_cost := v_settings_shipping;
    END IF;

    -- 6. Promo Code Calculation
    IF p_promo_code IS NOT NULL THEN
        -- Re-verify on server side
        v_promo_result := verify_promo_code(p_promo_code);
        
        IF (v_promo_result->>'valid')::BOOLEAN THEN
            -- Check min order amount (usually checked against Ara Toplam)
            IF v_total_subtotal >= (v_promo_result->>'min_order_amount')::DECIMAL THEN
                IF (v_promo_result->>'discount_type') = 'percentage' THEN
                    -- Apply to gross total (subtotal + vat) as seen in frontend
                    v_discount := v_gross_total * ((v_promo_result->>'discount_value')::DECIMAL / 100);
                    
                    -- Cap discount if max_discount_amount is set
                    IF (v_promo_result->>'max_discount_amount') IS NOT NULL AND v_discount > (v_promo_result->>'max_discount_amount')::DECIMAL THEN
                        v_discount := (v_promo_result->>'max_discount_amount')::DECIMAL;
                    END IF;
                ELSE
                    v_discount := (v_promo_result->>'discount_value')::DECIMAL;
                END IF;

                -- Update promo usage count
                UPDATE promo_codes 
                SET usage_count = usage_count + 1 
                WHERE code ILIKE p_promo_code;
            END IF;
        END IF;
    END IF;

    -- 7. Calculate Final Total
    v_final_total := v_gross_total + v_shipping_cost - v_discount;

    -- 8. Create Order
    -- Determine initial status and payment status based on payment method
    IF p_payment_method = 'credit_card' THEN
        v_initial_status := 'processing';
        v_initial_payment_status := 'paid';
    ELSE
        v_initial_status := 'pending';
        v_initial_payment_status := 'pending';
    END IF;
    
    -- Bank Reference
    IF p_payment_method = 'bank_transfer' THEN
        v_bank_ref := 'BRV-' || to_char(NOW(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    END IF;

    v_order_details := jsonb_build_object(
        'items', v_valid_items,
        'subtotal', v_total_subtotal,
        'vat_amount', v_total_vat,
        'discount', v_discount,
        'promo_code', p_promo_code,
        'shipping_cost', v_shipping_cost,
        'total', v_final_total,
        'bank_reference', v_bank_ref
    );

    INSERT INTO orders (
        user_id,
        order_details,
        status,
        payment_method,
        payment_status,
        shipping_address_id
    ) VALUES (
        v_user_id,
        v_order_details,
        v_initial_status,
        p_payment_method,
        v_initial_payment_status,
        p_shipping_address_id
    ) RETURNING id INTO v_order_id;

    -- Insert Status History
    INSERT INTO order_status_history (order_id, status, note, created_at)
    VALUES (
        v_order_id,
        v_initial_status,
        CASE WHEN p_payment_method = 'credit_card' THEN 'Sipariş alındı (Kredi Kartı)' ELSE 'Sipariş alındı (Havale/EFT Bekleniyor)' END,
        NOW()
    );

    -- NOTE: Stock is NOT deducted here anymore. 
    -- It is handled by the trigger 'trigger_manage_inventory' on the 'orders' table.

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', v_order_id,
        'subtotal', v_total_subtotal,
        'vat', v_total_vat,
        'discount', v_discount,
        'total', v_final_total,
        'shipping_cost', v_shipping_cost,
        'bank_reference', v_bank_ref,
        'message', 'Sipariş başarıyla oluşturuldu'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Bir hata oluştu: ' || SQLERRM
    );
END;
$$;
