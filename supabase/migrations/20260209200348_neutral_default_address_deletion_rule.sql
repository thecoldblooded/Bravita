CREATE OR REPLACE FUNCTION public.check_default_address_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_default = true AND EXISTS (
        SELECT 1 FROM public.addresses 
        WHERE user_id = OLD.user_id AND id != OLD.id
    ) THEN
        RAISE EXCEPTION 'ERR_ADDRESS_DELETE_DEFAULT_FORBIDDEN';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
