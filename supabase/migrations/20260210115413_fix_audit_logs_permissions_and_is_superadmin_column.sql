-- 1. profiles tablosuna is_superadmin kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN public.profiles.is_superadmin IS 'SuperAdmin yetkisi - Sadece audit trail izleme yetkisine sahiptir';
    END IF;
END $$;

-- 2. Audit log tablosunun RLS ayarlarını güncelle
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Mevcut view policesini kaldır (Adminlere açıktı, artık sadece Superadmin)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;

-- Yeni Policy: Sadece SuperAdminler görebilir
CREATE POLICY "Superadmins can view audit logs" ON public.admin_audit_log
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_superadmin = true
        )
    );

-- Yeni Policy: Service role (backend) her zaman log yazabilir
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);;
