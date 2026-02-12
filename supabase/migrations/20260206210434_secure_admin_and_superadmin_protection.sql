-- Enhanced Function to sync admin status with Super Admin protection
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
BEGIN
    -- Get user email to check for Super Admin status
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

    -- Prevent revoking admin status from Super Admin
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
END;
$$;
;
