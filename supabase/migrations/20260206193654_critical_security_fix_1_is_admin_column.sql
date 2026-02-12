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
END $$;;
