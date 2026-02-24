BEGIN;

ALTER TABLE public.site_settings
    ALTER COLUMN vat_rate SET DEFAULT 0.01;

INSERT INTO public.site_settings (id, vat_rate)
VALUES (1, 0.01)
ON CONFLICT (id) DO UPDATE
SET vat_rate = EXCLUDED.vat_rate;

UPDATE public.site_settings
SET vat_rate = 0.01
WHERE vat_rate IS DISTINCT FROM 0.01;

DO $$
DECLARE
    v_proc regprocedure;
    v_sql text;
BEGIN
    v_proc := to_regprocedure('public.create_order(jsonb,uuid,text,text)');

    IF v_proc IS NOT NULL THEN
        SELECT pg_get_functiondef(v_proc) INTO v_sql;

        v_sql := replace(
            v_sql,
            'COALESCE(vat_rate, 0.20)',
            'COALESCE(vat_rate, 0.01)'
        );

        EXECUTE v_sql;
    END IF;
END;
$$;

DO $$
DECLARE
    v_proc regprocedure;
    v_sql text;
BEGIN
    v_proc := to_regprocedure('public.validate_checkout(text,integer,text)');

    IF v_proc IS NOT NULL THEN
        SELECT pg_get_functiondef(v_proc) INTO v_sql;

        v_sql := replace(
            v_sql,
            'v_vat_rate DECIMAL(5, 4) := 0.20;',
            'v_vat_rate DECIMAL(5, 4) := 0.01;'
        );

        EXECUTE v_sql;
    END IF;
END;
$$;

DO $$
DECLARE
    v_proc regprocedure;
    v_sql text;
BEGIN
    v_proc := to_regprocedure('public.calculate_order_quote_v1(uuid,jsonb,uuid,text,integer,text)');

    IF v_proc IS NOT NULL THEN
        SELECT pg_get_functiondef(v_proc) INTO v_sql;

        v_sql := replace(
            v_sql,
            'v_vat_rate NUMERIC(10,4) := 0.20;',
            'v_vat_rate NUMERIC(10,4) := 0.01;'
        );

        v_sql := replace(
            v_sql,
            'COALESCE(vat_rate, 0.20)',
            'COALESCE(vat_rate, 0.01)'
        );

        EXECUTE v_sql;
    END IF;
END;
$$;

UPDATE public.email_templates
SET content_html = REPLACE(content_html, 'KDV (%20)', 'KDV (%1)'),
    updated_at = NOW()
WHERE content_html LIKE '%KDV (%20)%';

COMMIT;
