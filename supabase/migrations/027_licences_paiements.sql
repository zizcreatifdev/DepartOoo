-- ============================================================
-- 027_licences_paiements.sql
-- Suivi des licences et paiements par département
-- ============================================================

-- ── 1. Dates de licence sur departments ──────────────────────
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS licence_debut    DATE,
  ADD COLUMN IF NOT EXISTS licence_expire   DATE,
  ADD COLUMN IF NOT EXISTS licence_note     TEXT;

-- Initialiser les départements existants avec 1 mois d'essai
-- (à partir de leur date de création)
UPDATE public.departments
SET
  licence_debut  = created_at::DATE,
  licence_expire = (created_at + interval '30 days')::DATE
WHERE licence_debut IS NULL
  AND onboarding_completed = true;

-- ── 2. Table paiements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paiements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  montant         INTEGER     NOT NULL DEFAULT 0,    -- en FCFA
  date_echeance   DATE        NOT NULL,
  date_paiement   DATE,                              -- NULL = non payé
  statut          TEXT        NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente', 'paye', 'en_retard', 'annule')),
  mode_paiement   TEXT,                              -- 'wave', 'om', 'virement', etc.
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paiements_department ON public.paiements(department_id);
CREATE INDEX IF NOT EXISTS idx_paiements_statut     ON public.paiements(statut);
CREATE INDEX IF NOT EXISTS idx_paiements_echeance   ON public.paiements(date_echeance);

CREATE TRIGGER set_paiements_updated_at
  BEFORE UPDATE ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3. RLS paiements ──────────────────────────────────────────
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paiements_select_owner" ON public.paiements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "paiements_insert_owner" ON public.paiements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "paiements_update_owner" ON public.paiements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "paiements_delete_owner" ON public.paiements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );
