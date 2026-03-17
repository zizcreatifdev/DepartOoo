-- ============================================================
-- 028_comptabilite_chef.sql
-- 1. Ajout is_first_login sur profiles (pour les chefs créés par l'owner)
-- 2. Table depenses (comptabilité owner)
-- ============================================================

-- ── 1. Première connexion ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Table des dépenses owner ───────────────────────────
CREATE TABLE IF NOT EXISTS public.depenses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie       TEXT        NOT NULL
                  CHECK (categorie IN (
                    'hebergement', 'outils', 'marketing',
                    'salaires', 'communication', 'autres'
                  )),
  libelle         TEXT        NOT NULL,
  montant         INTEGER     NOT NULL CHECK (montant > 0),  -- en FCFA
  date_depense    DATE        NOT NULL DEFAULT CURRENT_DATE,
  mode_paiement   TEXT,       -- 'wave', 'om', 'virement', 'especes', etc.
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_depenses_date      ON public.depenses(date_depense);
CREATE INDEX IF NOT EXISTS idx_depenses_categorie ON public.depenses(categorie);

CREATE TRIGGER set_depenses_updated_at
  BEFORE UPDATE ON public.depenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS : owner uniquement
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depenses_select_owner" ON public.depenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "depenses_insert_owner" ON public.depenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "depenses_update_owner" ON public.depenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "depenses_delete_owner" ON public.depenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );
