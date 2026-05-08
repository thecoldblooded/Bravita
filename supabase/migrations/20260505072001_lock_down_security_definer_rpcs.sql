BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (is_admin = true OR is_superadmin = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  admin_status boolean;
BEGIN
  SELECT (is_admin = true OR is_superadmin = true)
    INTO admin_status
    FROM public.profiles
   WHERE id = user_id
   LIMIT 1;

  RETURN COALESCE(admin_status, false);
END;
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_superadmin = true
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_superadmin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_superadmin_user() TO authenticated;

DO $$
DECLARE
  policy_record record;
  using_expr text;
  check_expr text;
  alter_sql text;
BEGIN
  FOR policy_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name,
      pg_get_expr(p.polqual, p.polrelid) AS using_expression,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expression
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) LIKE '%is_admin_user(%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%is_admin_user(%'
        OR pg_get_expr(p.polqual, p.polrelid) LIKE '%is_superadmin_user(%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%is_superadmin_user(%'
      )
  LOOP
    using_expr := policy_record.using_expression;
    check_expr := policy_record.check_expression;

    IF using_expr IS NOT NULL THEN
      using_expr := replace(using_expr, 'is_admin_user(', 'private.is_admin_user(');
      using_expr := replace(using_expr, 'is_superadmin_user(', 'private.is_superadmin_user(');
    END IF;

    IF check_expr IS NOT NULL THEN
      check_expr := replace(check_expr, 'is_admin_user(', 'private.is_admin_user(');
      check_expr := replace(check_expr, 'is_superadmin_user(', 'private.is_superadmin_user(');
    END IF;

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I',
      policy_record.policy_name,
      policy_record.schema_name,
      policy_record.table_name
    );

    IF using_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', using_expr);
    END IF;

    IF check_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', check_expr);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.assert_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_request_role text;
BEGIN
  current_request_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role(),
    current_user
  );

  IF current_request_role <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_service_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_service_role() TO service_role;

CREATE OR REPLACE FUNCTION public.create_order_for_user_v1(
  p_user_id uuid,
  p_items jsonb,
  p_shipping_address_id uuid,
  p_payment_method text,
  p_promo_code text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM private.assert_service_role();

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Oturum gerekli');
  END IF;

  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  RETURN public.create_order(p_items, p_shipping_address_id, p_payment_method, p_promo_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_promo_code_for_actor_v1(
  p_actor_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM private.assert_service_role();

  IF p_actor_id IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  END IF;

  RETURN public.verify_promo_code(p_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_support_ticket_for_actor_v1(
  p_actor_id uuid,
  p_name text,
  p_email text,
  p_category text,
  p_subject text,
  p_message text
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM private.assert_service_role();

  IF p_actor_id IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.create_support_ticket_v1(
    p_name,
    p_email,
    p_category,
    p_subject,
    p_message,
    p_actor_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status_for_actor_v1(
  p_actor_id uuid,
  p_order_id uuid,
  p_new_status text,
  p_note text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM private.assert_service_role();

  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  RETURN public.admin_update_order_status(p_order_id, p_new_status, p_note);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_v2_for_actor_v1(
  p_actor_id uuid,
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM private.assert_service_role();

  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  RETURN public.get_dashboard_stats_v2(start_date, end_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_admin_status_for_actor_v1(
  p_actor_id uuid,
  p_user_id uuid,
  p_is_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM private.assert_service_role();

  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  PERFORM public.sync_user_admin_status(p_user_id, p_is_admin);
END;
$$;

DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.admin_get_all_orders(text,integer,integer)',
    'public.admin_set_user_admin(uuid,boolean)',
    'public.admin_update_order_status(uuid,text,text)',
    'public.check_default_address_deletion()',
    'public.create_order(jsonb,uuid,text,text)',
    'public.create_support_ticket_v1(text,text,text,text,text,uuid)',
    'public.finalize_reservation(uuid,integer)',
    'public.get_dashboard_stats(timestamp with time zone,timestamp with time zone)',
    'public.get_dashboard_stats_v2(timestamp with time zone,timestamp with time zone)',
    'public.handle_new_order_promo()',
    'public.handle_new_user()',
    'public.handle_updated_at()',
    'public.handle_user_confirmation_email()',
    'public.increment_promo_usage(text)',
    'public.is_admin_user()',
    'public.is_admin_user(uuid)',
    'public.is_superadmin_user()',
    'public.log_admin_action()',
    'public.prevent_profile_privilege_self_escalation()',
    'public.reserve_stock(uuid,integer)',
    'public.restore_stock(uuid,integer)',
    'public.sync_user_admin_status(uuid,boolean)',
    'public.validate_checkout(text,integer,text)',
    'public.verify_promo_code(text)',
    'public.create_order_for_user_v1(uuid,jsonb,uuid,text,text)',
    'public.verify_promo_code_for_actor_v1(uuid,text)',
    'public.create_support_ticket_for_actor_v1(uuid,text,text,text,text,text)',
    'public.admin_update_order_status_for_actor_v1(uuid,uuid,text,text)',
    'public.get_dashboard_stats_v2_for_actor_v1(uuid,timestamp with time zone,timestamp with time zone)',
    'public.sync_user_admin_status_for_actor_v1(uuid,uuid,boolean)'
  ]
  LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', function_signature);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', function_signature);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', function_signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_signature);
    END IF;
  END LOOP;
END;
$$;

COMMIT;
