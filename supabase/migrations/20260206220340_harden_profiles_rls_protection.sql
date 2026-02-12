-- 1. Harden profiles RLS to prevent self-promotion to admin
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE 
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND (
            -- Sadece Mevcut is_admin değerini koruyabilir (değiştiremez)
            -- VEYA admin ise her şeyi değiştirebilir
            (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
            OR 
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
        )
    );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT 
    WITH CHECK (
        id = auth.uid() 
        AND is_admin = false -- Yeni kullanıcılar asla admin olarak başlayamaz
    );

-- 2. Audit Trail for Admin Actions (Ensure logging is active)
-- sync_user_admin_status function'ına logging ekleyelim
CREATE OR REPLACE FUNCTION public.sync_user_admin_status(
    p_user_id UUID,
    p_is_admin BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_email TEXT;
    v_super_admin_email CONSTANT TEXT := 'umut.dog91@gmail.com';
    v_admin_id UUID;
BEGIN
    v_admin_id := auth.uid();
    
    -- Get user email
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

    -- Super Admin protection
    IF v_user_email = v_super_admin_email AND p_is_admin = FALSE THEN
        RAISE EXCEPTION 'Süper admin yetkisi kaldırılamaz.';
    END IF;

    -- 1. Update public.profiles
    UPDATE public.profiles
    SET is_admin = p_is_admin
    WHERE id = p_user_id;

    -- 2. Update auth.users metadata
    UPDATE auth.users
    SET 
        raw_app_meta_data = raw_app_meta_data || jsonb_build_object('is_admin', p_is_admin),
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_admin', p_is_admin)
    WHERE id = p_user_id;

    -- 3. Log the action
    INSERT INTO public.admin_audit_log (admin_user_id, action, target_table, target_id, details)
    VALUES (
        v_admin_id, 
        CASE WHEN p_is_admin THEN 'PROMOTED_TO_ADMIN' ELSE 'DEMOTED_FROM_ADMIN' END,
        'profiles',
        p_user_id,
        jsonb_build_object('email', v_user_email)
    );
END;
$$;
;
