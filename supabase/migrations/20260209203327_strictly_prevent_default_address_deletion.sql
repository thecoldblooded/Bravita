-- Update the function to strictly forbid deleting default addresses
CREATE OR REPLACE FUNCTION public.check_default_address_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_default = true THEN
       RAISE EXCEPTION 'ERR_ADDRESS_DELETE_DEFAULT_FORBIDDEN';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;;
