-- B3: Tighten EXECUTE grants for admin/helper RPC functions.
-- Goal: fail closed for anonymous/public role while preserving authenticated admin flows.

BEGIN;

DO $$
BEGIN
  -- admin_update_order_status is used by authenticated admin UI RPC calls.
  IF to_regprocedure('public.admin_update_order_status(uuid,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid,text,text) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid,text,text) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid,text,text) TO authenticated';
  END IF;

  -- get_dashboard_stats is used by authenticated admin dashboard RPC calls.
  IF to_regprocedure('public.get_dashboard_stats(timestamp with time zone,timestamp with time zone)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_dashboard_stats(timestamp with time zone,timestamp with time zone) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(timestamp with time zone,timestamp with time zone) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(timestamp with time zone,timestamp with time zone) TO authenticated';
  END IF;

  -- sync_user_admin_status is restricted to authenticated users.
  IF to_regprocedure('public.sync_user_admin_status(uuid,boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.sync_user_admin_status(uuid,boolean) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.sync_user_admin_status(uuid,boolean) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sync_user_admin_status(uuid,boolean) TO authenticated';
  END IF;

  -- is_admin_user helpers are used by authenticated policies/RPCs.
  IF to_regprocedure('public.is_admin_user()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated';
  END IF;

  IF to_regprocedure('public.is_admin_user(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated';
  END IF;
END;
$$;

COMMIT;
