-- ============================================================
-- Migration 023 : Politiques READ pour le rôle owner
-- L'owner n'a pas de department_id → les politiques par défaut
-- (basées sur get_my_department_id()) ne retournent rien.
-- Ce fichier ajoute des politiques SELECT supplémentaires
-- pour que le dashboard owner ait accès à toutes les données.
-- ============================================================

-- Fonction helper idempotente
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- departments
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'departments' AND policyname = 'owner_read_departments'
  ) THEN
    CREATE POLICY "owner_read_departments"
      ON public.departments FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- profiles
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'owner_read_profiles'
  ) THEN
    CREATE POLICY "owner_read_profiles"
      ON public.profiles FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- user_roles
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_roles' AND policyname = 'owner_read_user_roles'
  ) THEN
    CREATE POLICY "owner_read_user_roles"
      ON public.user_roles FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- enseignants
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'enseignants' AND policyname = 'owner_read_enseignants'
  ) THEN
    CREATE POLICY "owner_read_enseignants"
      ON public.enseignants FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- seances
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seances' AND policyname = 'owner_read_seances'
  ) THEN
    CREATE POLICY "owner_read_seances"
      ON public.seances FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- presences
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'presences' AND policyname = 'owner_read_presences'
  ) THEN
    CREATE POLICY "owner_read_presences"
      ON public.presences FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- examens
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'examens' AND policyname = 'owner_read_examens'
  ) THEN
    CREATE POLICY "owner_read_examens"
      ON public.examens FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- examen_resultats
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'examen_resultats' AND policyname = 'owner_read_resultats'
  ) THEN
    CREATE POLICY "owner_read_resultats"
      ON public.examen_resultats FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- ============================================================
-- documents (lecture + écriture pour pipeline_commercial)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents' AND policyname = 'owner_read_documents'
  ) THEN
    CREATE POLICY "owner_read_documents"
      ON public.documents FOR SELECT
      USING (public.is_owner());
  END IF;
END $$;

-- pipeline_commercial : ALL déjà géré par pipeline_owner_policy (migration 020)
-- Pas besoin de politique supplémentaire ici.
