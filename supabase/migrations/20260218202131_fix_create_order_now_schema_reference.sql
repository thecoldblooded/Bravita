DO $$
DECLARE
    v_def text;
BEGIN
    v_def := pg_get_functiondef('public.create_order(jsonb, uuid, text, text)'::regprocedure);

    IF position('public.now()' in v_def) > 0 THEN
        v_def := replace(v_def, 'public.now()', 'pg_catalog.now()');
        EXECUTE v_def;
    END IF;
END $$;;
