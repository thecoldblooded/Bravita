CREATE OR REPLACE FUNCTION public.check_default_address_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer silinen adres varsayılan ise VE kullanıcının başka adresleri de varsa işlemi engelle
    IF OLD.is_default = true AND EXISTS (
        SELECT 1 FROM public.addresses 
        WHERE user_id = OLD.user_id AND id != OLD.id
    ) THEN
        RAISE EXCEPTION 'Birden fazla adresiniz varken varsayılan adresinizi silemezsiniz. Lütfen önce başka bir adresi varsayılan yapın.'
        USING ERRCODE = 'P0001'; -- Custom exception code
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur (Eğer varsa önce sil)
DROP TRIGGER IF EXISTS tr_check_default_address_deletion ON public.addresses;
CREATE TRIGGER tr_check_default_address_deletion
BEFORE DELETE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.check_default_address_deletion();;
