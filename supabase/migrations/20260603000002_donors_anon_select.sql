-- Allow anonymous users to read donors (needed for public donation flow:
-- checking existing accounts, pseudo/email availability).
-- These reads happen server-side (Server Actions / API routes), never in the browser.
CREATE POLICY "Public can read donors"
  ON donors FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous (server-side webhook / API routes) to update Stripe fields on donors.
-- The anon key is used by Next.js API routes that have no authenticated session.
CREATE POLICY "Anon can update donor stripe fields"
  ON donors FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous (Stripe webhook) to insert donations.
CREATE POLICY "Anon can insert donations"
  ON donations FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous to read donations (public totals on home page + webhook dedup check).
CREATE POLICY "Public can read donations"
  ON donations FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous (Stripe webhook) to update donation status (processing → paid / failed).
CREATE POLICY "Anon can update donation statut"
  ON donations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
