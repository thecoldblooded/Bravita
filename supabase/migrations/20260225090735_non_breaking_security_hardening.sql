set check_function_bodies = off;

-- Non-breaking hardening: standardize SECURITY DEFINER search_path
DO $$
DECLARE
  fn_signature text;
BEGIN
  FOR fn_signature IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
        'check_default_address_deletion',
        'finalize_reservation',
        'get_dashboard_stats',
        'handle_updated_at',
        'increment_promo_usage',
        'is_admin_user',
        'is_superadmin_user',
        'log_admin_action',
        'reserve_stock',
        'restore_stock'
      ])
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO public, pg_catalog',
      fn_signature
    );
  END LOOP;
END
$$;

-- Non-breaking RLS hardening: PUBLIC -> authenticated where auth.uid() is already mandatory
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'addresses'
      AND policyname = 'Users can insert own addresses'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can insert own addresses" ON public.addresses TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'addresses'
      AND policyname = 'Users can update own addresses'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can update own addresses" ON public.addresses TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'addresses'
      AND policyname = 'Users can delete own addresses'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can delete own addresses" ON public.addresses TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Users can insert own orders'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can insert own orders" ON public.orders TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can insert their own profile" ON public.profiles TO authenticated';
  END IF;
END
$$;;
