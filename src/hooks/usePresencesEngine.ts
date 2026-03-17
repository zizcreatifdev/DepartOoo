/**
 * usePresencesEngine.ts
 * Hook React autour du moteur de présences.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { afterSaisiePresences, marquerAbandon } from '@/engine/presences.engine';

export function usePresencesEngine() {
  const [processing, setProcessing] = useState(false);

  /**
   * À appeler juste après la sauvegarde réussie d'une fiche de présences.
   * Lance la vérification des seuils et crée les alertes / exclusions nécessaires.
   */
  const runAfterSaisie = useCallback(async (
    seance_id: string,
    department_id: string,
    academic_year: string,
  ): Promise<void> => {
    setProcessing(true);
    try {
      await afterSaisiePresences(seance_id, department_id, academic_year);
    } catch (err) {
      console.error('[presences engine] afterSaisiePresences:', err);
      // Non-bloquant : la présence est bien sauvée, seule la vérification a échoué
      toast.error('Erreur lors de la vérification des seuils d'absences');
    } finally {
      setProcessing(false);
    }
  }, []);

  /**
   * Marque un étudiant comme abandonné (is_active=false + statut_exclusion='abandonne').
   */
  const runMarquerAbandon = useCallback(async (student_id: string): Promise<boolean> => {
    setProcessing(true);
    try {
      await marquerAbandon(student_id);
      toast.success('Étudiant marqué comme abandonné');
      return true;
    } catch (err) {
      console.error('[presences engine] marquerAbandon:', err);
      toast.error('Erreur lors du marquage abandon');
      return false;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { processing, runAfterSaisie, runMarquerAbandon };
}
