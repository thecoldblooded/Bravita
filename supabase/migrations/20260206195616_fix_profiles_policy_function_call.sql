-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;

-- Recreate with correct function call
CREATE POLICY "Users and admins can view profiles"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() OR is_admin_user(auth.uid()) = true
);;
