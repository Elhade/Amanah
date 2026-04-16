/*
  # Fix profiles RLS to prevent recursion

  The previous admin check policy on profiles was querying profiles from within 
  a profiles policy, which can cause infinite recursion. This migration:
  
  1. Drops the recursive admin policy
  2. Creates a security definer function to safely check admin status
  3. Updates all admin check policies to use the safe function
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert leaders" ON leaders;
CREATE POLICY "Admins can insert leaders"
  ON leaders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update leaders" ON leaders;
CREATE POLICY "Admins can update leaders"
  ON leaders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete leaders" ON leaders;
CREATE POLICY "Admins can delete leaders"
  ON leaders FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert projects" ON projects;
CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update projects" ON projects;
CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete projects" ON projects;
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update donations" ON donations;
CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
