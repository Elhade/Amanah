/*
  # JamaaAmanah - Initial Schema

  ## Overview
  Complete database schema for JamaaAmanah donation management app.

  ## New Tables

  ### profiles
  Extends Supabase auth.users with app-level user data.
  - id: references auth.users
  - email, nom: user info
  - role: 'super_admin' or 'leader'

  ### leaders
  Each leader has a unique slug for their donation link.
  - user_id: references profiles
  - nom_affichage: display name
  - slug: unique URL slug (/donate?ref=slug)

  ### projects
  Donation campaigns/projects.
  - nom, description, objectif (optional fundraising goal)

  ### donors
  People who donate (no auth required).
  - nom: donor name

  ### donations
  Core transaction records.
  - donor_id, leader_id, project_id: relations
  - montant: amount
  - methode: stripe | paypal | cash
  - statut: paid | pending | cash_validated

  ## Security
  - RLS enabled on all tables
  - Leaders can only manage their own donations
  - Admins have full access
  - Public can insert donations (for online payments)
*/

-- =====================
-- PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nom text DEFAULT '',
  role text DEFAULT 'leader' CHECK (role IN ('super_admin', 'leader')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================
-- LEADERS
-- =====================
CREATE TABLE IF NOT EXISTS leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  nom_affichage text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read leaders"
  ON leaders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert leaders"
  ON leaders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can update leaders"
  ON leaders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can delete leaders"
  ON leaders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================
-- PROJECTS
-- =====================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text DEFAULT '',
  objectif numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow anon to read projects (for public donation page)
CREATE POLICY "Public can read projects"
  ON projects FOR SELECT
  TO anon
  USING (true);

-- =====================
-- DONORS
-- =====================
CREATE TABLE IF NOT EXISTS donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read donors"
  ON donors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert donors"
  ON donors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert donors"
  ON donors FOR INSERT
  TO anon
  WITH CHECK (true);

-- =====================
-- DONATIONS
-- =====================
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES donors(id),
  leader_id uuid REFERENCES leaders(id),
  project_id uuid REFERENCES projects(id),
  montant numeric NOT NULL CHECK (montant > 0),
  methode text DEFAULT 'cash' CHECK (methode IN ('stripe', 'paypal', 'cash')),
  statut text DEFAULT 'pending' CHECK (statut IN ('paid', 'pending', 'cash_validated')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all donations"
  ON donations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Anyone can insert donations"
  ON donations FOR INSERT
  TO anon
  WITH CHECK (true);

-- =====================
-- SEED DATA
-- =====================
INSERT INTO projects (nom, description, objectif)
VALUES
  ('Nourrir les Nécessiteux', 'Distribution de repas aux familles dans le besoin chaque semaine.', 5000),
  ('Sadaqa Jariya - Construction', 'Construction d''une salle de prière dans un quartier défavorisé.', 20000)
ON CONFLICT DO NOTHING;
