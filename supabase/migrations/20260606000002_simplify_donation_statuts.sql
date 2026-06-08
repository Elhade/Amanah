-- Migre les anciens statuts supprimés vers 'failed' avant d'ajouter la contrainte
UPDATE donations SET statut = 'failed' WHERE statut IN ('cancelled', 'refunded');

-- Supprime cancelled et refunded des statuts autorisés
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_statut_check;
ALTER TABLE donations
  ADD CONSTRAINT donations_statut_check
    CHECK (statut IN ('processing', 'paid', 'failed', 'cash_received', 'cash_remitted'));
