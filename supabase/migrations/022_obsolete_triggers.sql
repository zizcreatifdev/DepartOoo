-- ============================================================
-- Migration 022 : Triggers marquage automatique obsolète
--                + Extension contrainte type alertes
--                + Politique Storage bucket documents
-- ============================================================

-- ============================================================
-- 0. Étendre la contrainte CHECK de la table alertes
--    (nouveaux types ajoutés aux prompts 12 et suivants)
-- ============================================================

ALTER TABLE public.alertes
  DROP CONSTRAINT IF EXISTS alertes_type_check;

ALTER TABLE public.alertes
  ADD CONSTRAINT alertes_type_check CHECK (type IN (
    'absence_proche_seuil',
    'exclusion_automatique',
    'heures_rattraper',
    'sujet_retard',
    'licence_expiration',
    'disponibilite_manquante',
    'cours_modifie'
  ));

-- ============================================================
-- 1. Storage bucket 'documents' (privé)
--    Supabase Storage ne supporte pas CREATE BUCKET en SQL pur.
--    À créer manuellement via Dashboard → Storage → New bucket
--    Nom : documents | Accès : Private | Max file size : 50 MB
--    Chemin recommandé : [department_id]/[academic_year]/[type]/[filename]
-- ============================================================

-- Politique RLS Storage (à ajouter dans Dashboard → Storage → Policies)
-- Lecture/écriture réservée aux membres du même département :
--   bucket_id = 'documents'
--   (storage.foldername(name))[1] = get_my_department_id()::text

-- ============================================================
-- 2. Trigger : UPDATE seances → emploi_du_temps obsolète
-- ============================================================

CREATE OR REPLACE FUNCTION fn_seance_update_obsolete_docs()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne déclencher que si des champs structurels ont changé
  IF (
    OLD.seance_date       IS DISTINCT FROM NEW.seance_date       OR
    OLD.start_time        IS DISTINCT FROM NEW.start_time        OR
    OLD.end_time          IS DISTINCT FROM NEW.end_time          OR
    OLD.enseignant_id     IS DISTINCT FROM NEW.enseignant_id     OR
    OLD.room_id           IS DISTINCT FROM NEW.room_id           OR
    OLD.is_cancelled      IS DISTINCT FROM NEW.is_cancelled
  ) THEN
    UPDATE public.documents
    SET status = 'obsolete'
    WHERE department_id = NEW.department_id
      AND type = 'emploi_du_temps'
      AND status = 'actif';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_seance_obsolete_docs ON public.seances;
CREATE TRIGGER trg_seance_obsolete_docs
  AFTER UPDATE ON public.seances
  FOR EACH ROW
  EXECUTE FUNCTION fn_seance_update_obsolete_docs();

-- ============================================================
-- 3. Trigger : INSERT perturbations → emploi_du_temps + liste_presence obsolètes
-- ============================================================

CREATE OR REPLACE FUNCTION fn_perturbation_obsolete_docs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.documents
  SET status = 'obsolete'
  WHERE department_id = NEW.department_id
    AND type IN ('emploi_du_temps', 'liste_presence')
    AND status = 'actif';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_perturbation_obsolete_docs ON public.perturbations;
CREATE TRIGGER trg_perturbation_obsolete_docs
  AFTER INSERT ON public.perturbations
  FOR EACH ROW
  EXECUTE FUNCTION fn_perturbation_obsolete_docs();

-- ============================================================
-- 4. Trigger : INSERT / UPDATE examen_resultats → releve_notes + liste_resultats obsolètes
--    Remonte department_id via la table examens
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notes_obsolete_docs()
RETURNS TRIGGER AS $$
DECLARE
  v_dept_id UUID;
BEGIN
  SELECT department_id
    INTO v_dept_id
    FROM public.examens
   WHERE id = NEW.examen_id;

  IF v_dept_id IS NOT NULL THEN
    UPDATE public.documents
    SET status = 'obsolete'
    WHERE department_id = v_dept_id
      AND type IN ('releve_notes', 'liste_resultats')
      AND status = 'actif';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notes_obsolete_docs ON public.examen_resultats;
CREATE TRIGGER trg_notes_obsolete_docs
  AFTER INSERT OR UPDATE ON public.examen_resultats
  FOR EACH ROW
  EXECUTE FUNCTION fn_notes_obsolete_docs();

-- ============================================================
-- Index utile pour les requêtes de marquage
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_documents_status_dept
  ON public.documents(department_id, status, type);
