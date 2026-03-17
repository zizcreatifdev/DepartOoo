-- ============================================================
-- Migration 020 : Tables manquantes + colonne students
-- ============================================================

-- Helper function (idempotent)
CREATE OR REPLACE FUNCTION get_my_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- 1. student_exclusions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_exclusions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ue_id           UUID NOT NULL REFERENCES public.unites_enseignement(id) ON DELETE CASCADE,
  department_id   UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year   TEXT NOT NULL,
  nb_absences     INTEGER NOT NULL DEFAULT 0,
  excluded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  excluded_by     UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_exclusions_dept_policy"
  ON public.student_exclusions
  FOR ALL
  USING (department_id = get_my_department_id())
  WITH CHECK (department_id = get_my_department_id());

-- ============================================================
-- 2. alertes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alertes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'absence_proche_seuil',
                    'exclusion_automatique',
                    'heures_rattraper',
                    'sujet_retard',
                    'licence_expiration'
                  )),
  message         TEXT NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,
  lue             BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertes_dept_policy"
  ON public.alertes
  FOR ALL
  USING (department_id = get_my_department_id())
  WITH CHECK (department_id = get_my_department_id());

-- ============================================================
-- 3. pipeline_commercial
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pipeline_commercial (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id    UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  statut           TEXT NOT NULL CHECK (statut IN (
                     'discussion', 'demo', 'essai', 'converti', 'perdu'
                   )) DEFAULT 'discussion',
  note             TEXT,
  contact_nom      TEXT,
  contact_email    TEXT,
  derniere_action  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_commercial ENABLE ROW LEVEL SECURITY;

-- Pipeline visible uniquement par les owners (pas de department_id obligatoire)
CREATE POLICY "pipeline_owner_policy"
  ON public.pipeline_commercial
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================
-- 4. Colonne statut_exclusion sur students
-- ============================================================
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS statut_exclusion TEXT NOT NULL DEFAULT 'actif'
  CHECK (statut_exclusion IN ('actif', 'abandonne', 'exclu_absences'));

-- ============================================================
-- Index pour les performances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_student_exclusions_student
  ON public.student_exclusions(student_id);

CREATE INDEX IF NOT EXISTS idx_student_exclusions_ue
  ON public.student_exclusions(ue_id);

CREATE INDEX IF NOT EXISTS idx_alertes_department
  ON public.alertes(department_id, lue, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_statut
  ON public.pipeline_commercial(statut);
