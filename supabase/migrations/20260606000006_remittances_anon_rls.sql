-- Webhook Stripe (rôle anon, pas de session) doit pouvoir lire et mettre à jour les remises
CREATE POLICY "Anon can read remittances"
  ON remittances FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update remittances"
  ON remittances FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
