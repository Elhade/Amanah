-- Lie chaque leader à son enregistrement donor (pour les remittances SEPA)
ALTER TABLE leaders ADD COLUMN IF NOT EXISTS donor_id uuid REFERENCES donors(id);

-- Supprime les champs Stripe dupliqués sur leaders (ils vivent désormais sur donors)
ALTER TABLE leaders DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE leaders DROP COLUMN IF EXISTS stripe_payment_method_id;
