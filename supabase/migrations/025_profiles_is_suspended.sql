-- ============================================================
-- Migration 025 : Colonne is_suspended sur profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended
  ON public.profiles(department_id, is_suspended)
  WHERE is_suspended = true;
