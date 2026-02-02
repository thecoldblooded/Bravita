-- ============================================
-- CHECKOUT VALIDATION FUNCTION
-- ============================================
-- Bu fonksiyon checkout işlemini sunucu tarafında doğrular
-- Kullanım: SELECT * FROM validate_checkout('product-slug', quantity);

CREATE OR REPLACE FUNCTION validate_checkout(
    p_product_slug TEXT,
    p_quantity INTEGER,
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    IF p_quantity < 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_QUANTITY',
            'message', 'Miktar en az 1 olmalıdır'
        );
    END IF;
    
    IF p_quantity > v_product.max_quantity_per_order THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QUANTITY_EXCEEDED',
            'message', 'Maksimum sipariş miktarı: ' || v_product.max_quantity_per_order
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
        RETURN json_build_object(
            'success', false,
            'error', 'SERVER_ERROR',
            'message', 'Bir hata oluştu: ' || SQLERRM
        );
END;
$$;

-- Fonksiyonu public olarak çağrılabilir yap (RPC)
GRANT EXECUTE ON FUNCTION validate_checkout TO authenticated;
