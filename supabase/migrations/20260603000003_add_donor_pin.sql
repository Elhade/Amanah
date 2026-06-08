-- PIN pour authentifier les donateurs récurrents sans mot de passe lourd.
-- Le PIN n'est jamais stocké en clair : on stocke le hash (SHA-256) et le sel.
ALTER TABLE donors ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS pin_salt text;
