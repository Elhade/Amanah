-- Stripe fields on leaders for cash remittances
ALTER TABLE leaders ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE leaders ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

-- Remittances table: traces each cash remittance from a leader to the platform
CREATE TABLE IF NOT EXISTS remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid REFERENCES leaders(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text,
  montant numeric NOT NULL CHECK (montant > 0),
  statut text DEFAULT 'processing' CHECK (statut IN ('processing', 'cash_remitted', 'failed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE remittances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read remittances"
  ON remittances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert remittances"
  ON remittances FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update remittances"
  ON remittances FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Link donations to the remittance that settled them
ALTER TABLE donations ADD COLUMN IF NOT EXISTS remittance_id uuid REFERENCES remittances(id);
