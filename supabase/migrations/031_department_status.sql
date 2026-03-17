-- Migration 031 : colonne status sur departments
-- Valeurs : 'active' | 'blocked'

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'blocked'));

COMMENT ON COLUMN public.departments.status IS
  'Statut du département : active (normal) ou blocked (suspendu par l''owner)';
