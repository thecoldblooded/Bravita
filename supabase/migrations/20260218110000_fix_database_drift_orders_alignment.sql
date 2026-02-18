-- Migration: Align orders table with drift expectations and legacy function support
-- Created: 2026-02-18 10:30:00

BEGIN;

-- Add missing columns to orders table for drift alignment and legacy function support
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bank_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2);

-- Update create_order function to populate new columns
CREATE OR REPLACE FUNCTION public.create_order(
    p_items JSONB,
    p_shipping_address_id UUID,
    p_payment_method TEXT,
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
$$;

COMMIT;
