-- Ajoute cash_received et cash_remitted comme statuts valides pour les dons espèces
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_statut_check;
ALTER TABLE donations
  ADD CONSTRAINT donations_statut_check
    CHECK (statut IN (
      'pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded',
      'cash_received', 'cash_remitted'
    ));

-- Migrations des dons espèces existants marqués 'paid' → 'cash_remitted'
-- (ils ont été validés manuellement sous l'ancien modèle, donc considérés comme versés)
UPDATE donations
  SET statut = 'cash_remitted'
  WHERE methode = 'cash' AND statut = 'paid';
