-- Donor contact and identity fields
ALTER TABLE donors ADD COLUMN IF NOT EXISTS pseudo text UNIQUE;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS telephone text;

-- Stripe fields on donors (customer for SEPA mandate, payment_method for saved IBAN token)
ALTER TABLE donors ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

-- Stripe payment intent ID on donations (card and SEPA tracking)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text UNIQUE;

-- Redefine methode: card | prelevement_sepa
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_methode_check;
ALTER TABLE donations
  ALTER COLUMN methode SET DEFAULT 'card',
  ADD CONSTRAINT donations_methode_check
    CHECK (methode IN ('card', 'prelevement_sepa'));

-- Redefine statut: unified lifecycle for card and SEPA
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_statut_check;
ALTER TABLE donations
  ALTER COLUMN statut SET DEFAULT 'pending',
  ADD CONSTRAINT donations_statut_check
    CHECK (statut IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'));
