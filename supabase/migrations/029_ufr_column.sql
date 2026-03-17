-- Migration 029 : ajout colonne UFR dans departments
-- UFR = Unité de Formation et de Recherche (niveau intermédiaire entre université et département)

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS ufr TEXT;

COMMENT ON COLUMN public.departments.ufr IS
  'Unité de Formation et de Recherche (ex: UFR Sciences et Technologies)';
