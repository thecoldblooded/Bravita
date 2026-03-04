-- Add explicit before/after stock audit payload for product mutations.
-- Keeps existing admin audit behavior and extends `details` for `products` rows.

CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_is_admin BOOLEAN;
    v_details JSONB;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
    v_reserved_before INTEGER;
    v_reserved_after INTEGER;
BEGIN
    -- Existing behavior: only log when request has an authenticated admin user.
    IF auth.uid() IS NOT NULL THEN
        SELECT is_admin
        INTO v_is_admin
        FROM public.profiles
        WHERE id = auth.uid();

        IF v_is_admin = TRUE THEN
            v_details := jsonb_build_object(
                'old_data', (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END),
                'new_data', (CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END)
            );

            -- New behavior: add deterministic stock before/after block for products table writes.
            IF TG_TABLE_NAME = 'products' THEN
                v_stock_before := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.stock END;
                v_stock_after := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.stock END;

                v_reserved_before := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.reserved_stock END;
                v_reserved_after := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.reserved_stock END;

                v_details := v_details || jsonb_build_object(
                    'stock_audit',
                    jsonb_build_object(
                        'stock_before', v_stock_before,
                        'stock_after', v_stock_after,
                        'stock_delta',
                            CASE
                                WHEN v_stock_before IS NULL OR v_stock_after IS NULL THEN NULL
                                ELSE v_stock_after - v_stock_before
                            END,
                        'reserved_stock_before', v_reserved_before,
                        'reserved_stock_after', v_reserved_after,
                        'reserved_stock_delta',
                            CASE
                                WHEN v_reserved_before IS NULL OR v_reserved_after IS NULL THEN NULL
                                ELSE v_reserved_after - v_reserved_before
                            END,
                        'changed',
                            (v_stock_before IS DISTINCT FROM v_stock_after)
                            OR
                            (v_reserved_before IS DISTINCT FROM v_reserved_after)
                    )
                );
            END IF;

            INSERT INTO public.admin_audit_log (admin_user_id, action, target_table, target_id, details)
            VALUES (
                auth.uid(),
                TG_OP,
                TG_TABLE_NAME,
                COALESCE(NEW.id, OLD.id),
                v_details
            );
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$function$;
