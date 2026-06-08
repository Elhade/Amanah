-- Réintègre 'cash' comme méthode valide pour les dons enregistrés manuellement par un admin
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_methode_check;
ALTER TABLE donations
  ADD CONSTRAINT donations_methode_check
    CHECK (methode IN ('card', 'prelevement_sepa', 'cash'));
