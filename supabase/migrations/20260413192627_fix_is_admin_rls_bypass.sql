/*
  # Fix is_admin() function to bypass RLS

  The is_admin() function was querying the profiles table which has RLS policies
  that call is_admin(), causing infinite recursion and the "Database error querying schema".

  Fix: add SET row_security = off so the function bypasses RLS when checking admin status.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;
