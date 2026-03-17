-- ============================================================
-- Migration 021 : Colonnes perturbation sur seances
-- ============================================================

ALTER TABLE public.seances
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.seances
  ADD COLUMN IF NOT EXISTS perturbation_id UUID REFERENCES public.perturbations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seances_perturbation
  ON public.seances(perturbation_id)
  WHERE perturbation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seances_cancelled
  ON public.seances(department_id, is_cancelled)
  WHERE is_cancelled = true;
