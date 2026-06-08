-- Don personnel optionnel inclus dans le virement espèces
ALTER TABLE remittances
  ADD COLUMN IF NOT EXISTS personal_amount  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_donor_id  UUID REFERENCES donors(id),
  ADD COLUMN IF NOT EXISTS personal_project_id UUID REFERENCES projects(id);
