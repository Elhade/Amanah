-- Table Stripe balance_transaction (fee, net, amount réels)
CREATE TABLE IF NOT EXISTS balance_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_bt_id TEXT UNIQUE NOT NULL,
  amount      NUMERIC NOT NULL,
  fee         NUMERIC NOT NULL,
  net         NUMERIC NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;

-- Authenticated (admins, leaders) peuvent lire
CREATE POLICY "Auth can read balance_transactions"
  ON balance_transactions FOR SELECT TO authenticated USING (true);

-- Anon peut insérer (webhook Stripe n'a pas de session)
CREATE POLICY "Anon can insert balance_transactions"
  ON balance_transactions FOR INSERT TO anon WITH CHECK (true);

-- FK sur donations et remittances
ALTER TABLE donations   ADD COLUMN IF NOT EXISTS balance_transaction_id UUID REFERENCES balance_transactions(id);
ALTER TABLE remittances ADD COLUMN IF NOT EXISTS balance_transaction_id UUID REFERENCES balance_transactions(id);
