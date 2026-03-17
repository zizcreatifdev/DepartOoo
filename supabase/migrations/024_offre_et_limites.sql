-- ============================================================
-- Migration 024 : Colonne offre sur departments
--                + Vue department_member_counts
-- ============================================================

-- ── 1. Colonne offre ──────────────────────────────────────
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS offre TEXT
  NOT NULL DEFAULT 'starter'
  CHECK (offre IN ('starter', 'pro', 'universite'));

-- ── 2. Vue comptages membres par département ──────────────
-- Utilisée par les Edge Functions invite-teacher / invite-assistant
-- pour vérifier les limites en temps réel.
CREATE OR REPLACE VIEW public.department_member_counts AS
SELECT
  p.department_id,
  COUNT(CASE WHEN ur.role = 'assistant'  THEN 1 END) AS nb_assistants,
  COUNT(CASE WHEN ur.role = 'enseignant' THEN 1 END) AS nb_enseignants
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.department_id IS NOT NULL
GROUP BY p.department_id;

-- La vue est en lecture seule — pas de RLS nécessaire.
-- L'accès se fait depuis les Edge Functions via service_role_key.

-- ── 3. Index utile pour les requêtes de comptage ──────────
CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_department
  ON public.profiles(department_id)
  WHERE department_id IS NOT NULL;
