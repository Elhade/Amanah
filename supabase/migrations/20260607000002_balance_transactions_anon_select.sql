-- Le webhook Stripe (rôle anon) fait un upsert puis lit l'id inséré.
-- Sans cette politique SELECT, le .select('id').single() retourne null
-- → btId null → remittance sans balance_transaction_id → frais non affichés.
CREATE POLICY "Anon can read balance_transactions"
  ON balance_transactions FOR SELECT
  TO anon
  USING (true);
