-- Function to sync admin status across profiles and auth metadata
CREATE OR REPLACE FUNCTION public.sync_user_admin_status(
    p_user_id UUID,
    p_is_admin BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with service_role permissions to update auth.users
SET search_path = public, auth
AS $$
BEGIN
    -- 1. Update public.profiles
    UPDATE public.profiles
    SET is_admin = p_is_admin
    WHERE id = p_user_id;

    -- 2. Update auth.users metadata
    -- We update both raw_app_meta_data and raw_user_meta_data for maximum compatibility
    UPDATE auth.users
    SET 
        raw_app_meta_data = raw_app_meta_data || jsonb_build_object('is_admin', p_is_admin),
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_admin', p_is_admin)
    WHERE id = p_user_id;
END;
$$;

-- Grant execution to authenticated users (admins will call this)
GRANT EXECUTE ON FUNCTION public.sync_user_admin_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_admin_status(UUID, BOOLEAN) TO service_role;
;
