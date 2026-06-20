-- Normalize CRLF/LF drift for public.create_order detected by CI db diff.
-- This migration rewrites the function using pg_get_functiondef output after
-- replacing CRLF/CR with LF to stabilize cross-platform drift checks.

DO $$
DECLARE
    v_reg regprocedure := to_regprocedure('public.create_order(jsonb, uuid, text, text)');
    v_def text;
BEGIN
    IF v_reg IS NULL THEN
        RAISE NOTICE 'public.create_order(jsonb, uuid, text, text) not found, skipping normalization';
        RETURN;
    END IF;

    SELECT pg_get_functiondef(v_reg) INTO v_def;

    IF position(E'\r' in v_def) > 0 THEN
        v_def := replace(v_def, E'\r\n', E'\n');
        v_def := replace(v_def, E'\r', E'\n');
        EXECUTE v_def;
        RAISE NOTICE 'Normalized line endings for public.create_order';
    ELSE
        RAISE NOTICE 'public.create_order already LF-normalized';
    END IF;
END
$$;
