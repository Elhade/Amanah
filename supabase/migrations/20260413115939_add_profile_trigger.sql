/*
  # Auto-create profile on user signup

  Creates a trigger that automatically inserts a row in the profiles table
  whenever a new user signs up via Supabase Auth.
  
  This ensures every authenticated user has a profile record.
  The default role is 'leader'. To create an admin, update the role manually
  in the Supabase dashboard or via SQL.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'leader')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
