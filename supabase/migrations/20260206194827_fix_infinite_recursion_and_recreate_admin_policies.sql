-- Drop all problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can update any address" ON public.addresses;
DROP POLICY IF EXISTS "Admins can delete any address" ON public.addresses;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);

-- Create the is_admin_user function first (without checking policies)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean AS $$
DECLARE
  admin_status boolean;
BEGIN
  -- Direct column access without triggering policy checks
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated, anon;

-- Now recreate admin policies using the function at the beginning
-- IMPORTANT: Policy evaluation should happen BEFORE join to avoid recursion

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  is_admin_user(auth.uid()) = true
);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (
  is_admin_user(auth.uid()) = true
)
WITH CHECK (
  is_admin_user(auth.uid()) = true
);

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses"
ON public.addresses FOR SELECT
USING (
  is_admin_user(auth.uid()) = true
);

-- Admins can update any address
CREATE POLICY "Admins can update any address"
ON public.addresses FOR UPDATE
USING (
  is_admin_user(auth.uid()) = true
)
WITH CHECK (
  is_admin_user(auth.uid()) = true
);

-- Admins can delete any address
CREATE POLICY "Admins can delete any address"
ON public.addresses FOR DELETE
USING (
  is_admin_user(auth.uid()) = true
);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (
  is_admin_user(auth.uid()) = true
);

-- Admins can update any order
CREATE POLICY "Admins can update any order"
ON public.orders FOR UPDATE
USING (
  is_admin_user(auth.uid()) = true
)
WITH CHECK (
  is_admin_user(auth.uid()) = true
);;
