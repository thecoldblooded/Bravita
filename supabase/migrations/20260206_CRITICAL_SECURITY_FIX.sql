-- ============================================
-- CRITICAL SECURITY FIX
-- Author: Security Audit Team
-- Date: 2026-02-06
-- Priority: URGENT - Deploy IMMEDIATELY
-- ============================================

-- ISSUE 1: profiles tablosunda is_admin kolonu eksik
-- ISSUE 2: Orders RLS - Admin bypass policy eksik
-- ISSUE 3: Addresses RLS - Admin bypass policy eksik
-- ISSUE 4: Admin backend fonksiyonları RLS ile bloklanıyor

-- ============================================
-- 1. ADD is_admin COLUMN TO PROFILES
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN public.profiles.is_admin IS 'Admin kullanıcı flag - SADECE backend tarafından set edilebilir';
    END IF;
END $$;

-- İlk admin kullanıcıyı oluştur (Manuel olarak değiştir!)
-- UPDATE public.profiles SET is_admin = true WHERE email = 'admin@bravita.com';

-- ============================================
-- 2. ADMIN BYPASS RLS POLICIES - PROFILES
-- ============================================

-- Admin kullanıcılar TÜM profilleri görebilir
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT 
    USING (
        -- Admin kullanıcıysa
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admin kullanıcılar is_admin flag'ini değiştirebilir
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- 3. ADMIN BYPASS RLS POLICIES - ADDRESSES
-- ============================================

-- Admin kullanıcılar TÜM adresleri görebilir
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
CREATE POLICY "Admins can view all addresses" ON public.addresses
    FOR SELECT 
    USING (
        -- Admin kullanıcıysa
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admin kullanıcılar herhangi bir adresi değiştirebilir
DROP POLICY IF EXISTS "Admins can update any address" ON public.addresses;
CREATE POLICY "Admins can update any address" ON public.addresses
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admin kullanıcılar herhangi bir adresi silebilir
DROP POLICY IF EXISTS "Admins can delete any address" ON public.addresses;
CREATE POLICY "Admins can delete any address" ON public.addresses
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- 4. ADMIN BYPASS RLS POLICIES - ORDERS
-- ============================================

-- Admin kullanıcılar TÜM siparişleri görebilir
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT 
    USING (
        -- Kendi siparişi VEYA admin
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admin kullanıcılar TÜM siparişleri güncelleyebilir (durum değişikliği)
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
CREATE POLICY "Admins can update any order" ON public.orders
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ⚠️ GÜVENLIK: Sadece checkout RPC siparişi ekleyebilir, kullanıcılar ekleyemez
-- Bu policy mevcut ise değiştirilmeyecek

-- ============================================
-- 5. BACKEND ADMIN VERIFICATION FUNCTION
-- ============================================

-- Admin kontrolü için helper function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin_user() IS 'Backend admin kontrolü için helper function';

-- ============================================
-- 6. ADMIN-ONLY RPC FUNCTIONS
-- ============================================

-- Admin: Tüm siparişleri getir (filtreleme ile)
CREATE OR REPLACE FUNCTION public.admin_get_all_orders(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    total DECIMAL,
    status TEXT,
    created_at TIMESTAMPTZ,
    user_email TEXT,
    user_name TEXT
) AS $$
BEGIN
    -- Admin kontrolü
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.user_id,
        o.total,
        o.status,
        o.created_at,
        p.email as user_email,
        p.full_name as user_name
    FROM public.orders o
    LEFT JOIN public.profiles p ON o.user_id = p.id
    WHERE 
        (p_status IS NULL OR o.status = p_status)
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.admin_get_all_orders IS 'Admin-only: Tüm siparişleri getirir';

-- Admin: Sipariş durumu güncelle
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin kontrolü
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    -- Geçerli durumlar
    IF p_new_status NOT IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    UPDATE public.orders
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_order_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.admin_update_order_status IS 'Admin-only: Sipariş durumunu günceller';

-- Admin: Kullanıcıya admin yetkisi ver/kaldır
CREATE OR REPLACE FUNCTION public.admin_set_user_admin(
    p_user_id UUID,
    p_is_admin BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin kontrolü
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    -- Kendini admin'den düşüremez
    IF p_user_id = auth.uid() AND p_is_admin = FALSE THEN
        RAISE EXCEPTION 'Cannot remove your own admin privileges';
    END IF;

    UPDATE public.profiles
    SET is_admin = p_is_admin, updated_at = NOW()
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.admin_set_user_admin IS 'Admin-only: Kullanıcıya admin yetkisi verir/kaldırır';

-- ============================================
-- 7. AUDIT LOG TABLE (Opsiyonel ama önerilen)
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES auth. users(id) NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_audit_log IS 'Admin işlem logları - GDPR compliance';

-- RLS: Sadece adminler kendi loglarını görebilir
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- 8. SECURITY FUNCTIONS - İNPUT SANITIZATION
-- ============================================

-- SQL Injection koruması için string sanitization
CREATE OR REPLACE FUNCTION public.sanitize_search_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Single quote escape
    RETURN REPLACE(input_text, '''', '''''');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.sanitize_search_input IS 'SQL Injection koruması için input temizleme';

-- ============================================
-- DEPLOYMENT INSTRUCTIONS
-- ============================================

/*
1. Bu SQL dosyasını Supabase SQL Editor'da çalıştır
2. İlk admin kullanıcıyı oluştur:
   UPDATE public.profiles SET is_admin = true WHERE email = 'YOUR_EMAIL@example.com';

3. Frontend'de admin.ts dosyasını güncelle:
   - getAllOrders() yerine admin_get_all_orders() kullan
   - updateOrderStatus() yerine admin_update_order_status() kullan
   - setUserAdmin() yerine admin_set_user_admin() kullan

4. Test et:
   - Admin kullanıcı ile login ol
   - Admin panelinde tüm siparişleri görebildiğini doğrula
   - Normal kullanıcı ile admin paneline erişemediğini doğrula

5. Audit log'ları kontrol et:
   SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10;
*/

-- Migration tamamlandı ✅
SELECT 'CRITICAL SECURITY FIX APPLIED SUCCESSFULLY' as status;
