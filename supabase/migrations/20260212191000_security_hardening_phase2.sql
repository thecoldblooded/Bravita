-- ============================================
-- Security Hardening Phase 2
-- Date: 2026-02-12
-- ============================================

BEGIN;
-- ------------------------------------------------
-- 1) Inventory integrity: prevent stock underflow
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
    item jsonb;
    qty int;
    prod_id uuid;
    target_pid uuid;
    old_status text;
    new_status text;
    is_new_active boolean;
    is_old_active boolean;
    is_new_delivered boolean;
    is_old_delivered boolean;
    is_new_cancelled boolean;
    is_old_cancelled boolean;
    v_rows_affected int;
BEGIN
    IF TG_OP = 'INSERT' THEN
        old_status := NULL;
        new_status := NEW.status;
    ELSE
        old_status := OLD.status;
        new_status := NEW.status;
    END IF;

    is_new_active := lower(coalesce(new_status, '')) IN ('pending', 'processing', 'preparing', 'shipped', 'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    is_old_active := lower(coalesce(old_status, '')) IN ('pending', 'processing', 'preparing', 'shipped', 'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    is_new_delivered := lower(coalesce(new_status, '')) IN ('delivered', 'teslim edildi');
    is_old_delivered := lower(coalesce(old_status, '')) IN ('delivered', 'teslim edildi');
    is_new_cancelled := lower(coalesce(new_status, '')) IN ('cancelled', 'iptal edildi', 'iade edildi');
    is_old_cancelled := lower(coalesce(old_status, '')) IN ('cancelled', 'iptal edildi', 'iade edildi');

    IF NEW.order_details->'items' IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
        LOOP
            qty := (item->>'quantity')::int;
            prod_id := (item->>'product_id')::uuid;

            IF qty IS NULL OR qty <= 0 THEN
                RAISE EXCEPTION 'Invalid quantity in order item';
            END IF;

            SELECT id
              INTO target_pid
              FROM public.products
             WHERE id = prod_id
             FOR UPDATE;

            IF target_pid IS NULL THEN
                RAISE EXCEPTION 'Product not found: %', prod_id;
            END IF;

            IF TG_OP = 'INSERT' THEN
                IF is_new_active THEN
                    UPDATE public.products
                       SET stock = stock - qty,
                           reserved_stock = COALESCE(reserved_stock, 0) + qty
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                ELSIF is_new_delivered THEN
                    UPDATE public.products
                       SET stock = stock - qty
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                END IF;
            ELSIF TG_OP = 'UPDATE' AND new_status IS DISTINCT FROM old_status THEN
                IF is_old_active AND is_new_delivered THEN
                    UPDATE public.products
                       SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty)
                     WHERE id = target_pid;
                ELSIF is_old_active AND is_new_cancelled THEN
                    UPDATE public.products
                       SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty),
                           stock = stock + qty
                     WHERE id = target_pid;
                ELSIF is_old_delivered AND is_new_cancelled THEN
                    UPDATE public.products
                       SET stock = stock + qty
                     WHERE id = target_pid;
                ELSIF is_old_cancelled AND is_new_active THEN
                    UPDATE public.products
                       SET stock = stock - qty,
                           reserved_stock = COALESCE(reserved_stock, 0) + qty
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                ELSIF is_old_cancelled AND is_new_delivered THEN
                    UPDATE public.products
                       SET stock = stock - qty
                     WHERE id = target_pid
                       AND stock >= qty;

                    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                    IF v_rows_affected = 0 THEN
                        RAISE EXCEPTION 'Insufficient stock for product %', target_pid;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;
-- ------------------------------------------------
-- 2) Missing secure RPC: create_support_ticket_v1
-- ------------------------------------------------
DROP FUNCTION IF EXISTS public.create_support_ticket_v1(text, text, text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.create_support_ticket_v1(
    p_name text,
    p_email text,
    p_category text,
    p_subject text,
    p_message text,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid := auth.uid();
    v_effective_user_id uuid := p_user_id;
    v_normalized_email text := lower(trim(coalesce(p_email, '')));
    v_normalized_name text := trim(coalesce(p_name, ''));
    v_normalized_subject text := trim(coalesce(p_subject, ''));
    v_normalized_message text := trim(coalesce(p_message, ''));
    v_category text := lower(trim(coalesce(p_category, '')));
    v_recent_attempts int := 0;
    v_ticket_id uuid;
BEGIN
    IF v_normalized_name = '' OR length(v_normalized_name) < 2 OR length(v_normalized_name) > 120 THEN
        RAISE EXCEPTION 'Invalid name';
    END IF;

    IF v_normalized_email = '' OR v_normalized_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email';
    END IF;

    IF v_normalized_subject = '' OR length(v_normalized_subject) < 5 OR length(v_normalized_subject) > 200 THEN
        RAISE EXCEPTION 'Invalid subject';
    END IF;

    IF v_normalized_message = '' OR length(v_normalized_message) < 10 OR length(v_normalized_message) > 5000 THEN
        RAISE EXCEPTION 'Invalid message';
    END IF;

    IF v_category NOT IN ('general', 'order_issue', 'product_info', 'delivery', 'other') THEN
        v_category := 'general';
    END IF;

    IF v_actor_id IS NULL AND v_effective_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_actor_id IS NOT NULL THEN
        IF v_effective_user_id IS NULL THEN
            v_effective_user_id := v_actor_id;
        ELSIF v_effective_user_id <> v_actor_id THEN
            RAISE EXCEPTION 'Forbidden';
        END IF;
    END IF;

    IF to_regclass('public.integration_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*)
          INTO v_recent_attempts
          FROM public.integration_rate_limits rl
         WHERE rl.integration_name = 'support'
           AND rl.action = 'ticket_create'
           AND rl.created_at > NOW() - INTERVAL '10 minutes'
           AND (
               (v_effective_user_id IS NOT NULL AND rl.actor_id = v_effective_user_id) OR
               (v_effective_user_id IS NULL AND rl.actor_email = v_normalized_email)
           );

        IF v_recent_attempts >= 5 THEN
            RAISE EXCEPTION 'Rate limit exceeded';
        END IF;
    END IF;

    INSERT INTO public.support_tickets (user_id, name, email, category, subject, message, status)
    VALUES (v_effective_user_id, v_normalized_name, v_normalized_email, v_category, v_normalized_subject, v_normalized_message, 'open')
    RETURNING public.support_tickets.id INTO v_ticket_id;

    id := v_ticket_id;

    IF to_regclass('public.integration_rate_limits') IS NOT NULL THEN
        INSERT INTO public.integration_rate_limits (integration_name, action, actor_id, actor_email)
        VALUES ('support', 'ticket_create', v_effective_user_id, v_normalized_email);
    END IF;

    RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.create_support_ticket_v1(text, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_support_ticket_v1(text, text, text, text, text, uuid) TO anon, authenticated;
-- ------------------------------------------------
-- 3) Missing secure RPC: sync_user_admin_status
-- ------------------------------------------------
DROP FUNCTION IF EXISTS public.sync_user_admin_status(uuid, boolean);
CREATE OR REPLACE FUNCTION public.sync_user_admin_status(
    p_user_id uuid,
    p_is_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid := auth.uid();
    v_actor_is_superadmin boolean := false;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT COALESCE(p.is_superadmin, false)
      INTO v_actor_is_superadmin
      FROM public.profiles p
     WHERE p.id = v_actor_id;

    IF NOT v_actor_is_superadmin THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid target user';
    END IF;

    IF p_user_id = v_actor_id AND p_is_admin = false THEN
        RAISE EXCEPTION 'Cannot remove your own admin privileges';
    END IF;

    UPDATE public.profiles
       SET is_admin = p_is_admin
     WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_user_id, action, target_table, target_id, details)
        VALUES (
            v_actor_id,
            CASE WHEN p_is_admin THEN 'GRANT_ADMIN' ELSE 'REVOKE_ADMIN' END,
            'profiles',
            p_user_id,
            jsonb_build_object('is_admin', p_is_admin)
        );
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_user_admin_status(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_admin_status(uuid, boolean) TO authenticated;
-- ------------------------------------------------
-- 4) SECURITY DEFINER search_path hardening
-- ------------------------------------------------
DO $$
BEGIN
    IF to_regprocedure('public.create_order(jsonb,uuid,text,text)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.create_order(jsonb, uuid, text, text) SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.validate_checkout(text,integer,text)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.validate_checkout(text, integer, text) SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.verify_promo_code(text)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.verify_promo_code(text) SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.is_admin_user()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.is_admin_user() SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.admin_get_all_orders(text,integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.admin_get_all_orders(text, integer, integer) SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.admin_update_order_status(uuid,text)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.admin_update_order_status(uuid, text) SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.admin_set_user_admin(uuid,boolean)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.admin_set_user_admin(uuid, boolean) SET search_path = public, pg_catalog';
    END IF;

    IF to_regprocedure('public.manage_inventory()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION public.manage_inventory() SET search_path = public, pg_catalog';
    END IF;
END $$;
COMMIT;
