-- Security hardening phase 3
-- Goal: prevent internal SQL error leakage from RPC responses.

DO $$
DECLARE
    create_order_reg regprocedure := to_regprocedure('public.create_order(jsonb, uuid, text, text)');
    create_order_definition text;
BEGIN
    IF create_order_reg IS NULL THEN
        RAISE NOTICE 'create_order not found, skipping sanitization';
        RETURN;
    END IF;

    SELECT pg_get_functiondef(create_order_reg) INTO create_order_definition;

    IF create_order_definition LIKE '%''Bir hata oluştu: '' || SQLERRM%' THEN
        create_order_definition := replace(
            create_order_definition,
            '''Bir hata oluştu: '' || SQLERRM',
            '''Sipariş oluşturulurken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'''
        );

        EXECUTE create_order_definition;
        RAISE NOTICE 'create_order SQLERRM leak sanitized';
    ELSE
        RAISE NOTICE 'create_order already sanitized';
    END IF;
END $$;

DO $$
DECLARE
    validate_checkout_reg regprocedure := to_regprocedure('public.validate_checkout(text, integer, text)');
    validate_checkout_definition text;
BEGIN
    IF validate_checkout_reg IS NULL THEN
        RAISE NOTICE 'validate_checkout not found, skipping sanitization';
        RETURN;
    END IF;

    SELECT pg_get_functiondef(validate_checkout_reg) INTO validate_checkout_definition;

    IF validate_checkout_definition LIKE '%''Bir hata oluştu: '' || SQLERRM%' THEN
        validate_checkout_definition := replace(
            validate_checkout_definition,
            '''Bir hata oluştu: '' || SQLERRM',
            '''Checkout doğrulaması sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'''
        );

        EXECUTE validate_checkout_definition;
        RAISE NOTICE 'validate_checkout SQLERRM leak sanitized';
    ELSE
        RAISE NOTICE 'validate_checkout already sanitized';
    END IF;
END $$;
