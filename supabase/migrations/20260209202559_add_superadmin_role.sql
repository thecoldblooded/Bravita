-- 1. Add is_superadmin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- 2. Set umut.dog91@gmail.com as superadmin
UPDATE public.profiles 
SET is_superadmin = TRUE, is_admin = TRUE 
WHERE email = 'umut.dog91@gmail.com';

-- 3. Update auth metadata for the superadmin
UPDATE auth.users
SET 
    raw_app_meta_data = raw_app_meta_data || jsonb_build_object('is_superadmin', TRUE, 'is_admin', TRUE),
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_superadmin', TRUE, 'is_admin', TRUE)
WHERE email = 'umut.dog91@gmail.com';

-- 4. Update the sync_user_admin_status RPC to enforce superadmin check
CREATE OR REPLACE FUNCTION public.sync_user_admin_status(p_user_id UUID, p_is_admin BOOLEAN)
RETURNS VOID AS $$
DECLARE
    v_target_email TEXT;
    v_caller_id UUID;
    v_caller_is_superadmin BOOLEAN;
BEGIN
    v_caller_id := auth.uid();
    
    -- Check if caller is superadmin
    SELECT is_superadmin INTO v_caller_is_superadmin 
    FROM public.profiles 
    WHERE id = v_caller_id;

    IF v_caller_is_superadmin IS NOT TRUE THEN
        RAISE EXCEPTION 'Sadece süper adminler yönetici yetkilerini değiştirebilir.';
    END IF;

    -- Get target user email
    SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;

    -- Protect superadmins from being demoted (even by other superadmins for safety, or at least self)
    IF v_target_email = 'umut.dog91@gmail.com' AND p_is_admin = FALSE THEN
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
        v_caller_id, 
        CASE WHEN p_is_admin THEN 'PROMOTED_TO_ADMIN' ELSE 'DEMOTED_FROM_ADMIN' END,
        'profiles',
        p_user_id,
        jsonb_build_object('email', v_target_email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;;
