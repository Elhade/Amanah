-- Add pseudo (unique), email, telephone, iban to donors
ALTER TABLE donors ADD COLUMN IF NOT EXISTS pseudo text UNIQUE;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS telephone text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS iban text;

-- Allow anon to read donors (needed for pseudo uniqueness feedback via INSERT error only)
-- No SELECT policy added — uniqueness is enforced at INSERT via unique constraint (code 23505)

-- Update donations.methode constraint to allow 'virement'
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_methode_check;
ALTER TABLE donations ADD CONSTRAINT donations_methode_check
  CHECK (methode IN ('stripe', 'paypal', 'cash', 'virement'));
