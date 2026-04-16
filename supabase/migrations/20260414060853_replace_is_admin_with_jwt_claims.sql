/*
  # Replace is_admin() with JWT-based check

  The previous is_admin() function queried the profiles table, which has RLS policies
  that also call is_admin(), causing infinite recursion and the PostgREST schema error.

  Fix: Replace is_admin() with a function that reads from JWT app_metadata claims only,
  which never touches the database and breaks the recursion entirely.

  Admin users must have { "role": "super_admin" } in their auth.users.raw_app_meta_data.
*/

-- Drop all policies that use is_admin() first
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete leaders" ON public.leaders;
DROP POLICY IF EXISTS "Admins can insert leaders" ON public.leaders;
DROP POLICY IF EXISTS "Admins can update leaders" ON public.leaders;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;

-- Replace is_admin() with a JWT-based implementation (no DB query, no recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
    false
  );
$$;

-- Recreate all admin policies using the new is_admin()
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update donations"
  ON public.donations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete leaders"
  ON public.leaders FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert leaders"
  ON public.leaders FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update leaders"
  ON public.leaders FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
