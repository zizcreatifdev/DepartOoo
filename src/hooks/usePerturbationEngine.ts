/**
 * usePerturbationEngine.ts
 * Hook React exposant declarerPerturbation et annulerPerturbation
 * avec gestion du loading et du résultat.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  declarerPerturbation as engineDeclarer,
  annulerPerturbation as engineAnnuler,
  type DeclarerPerturbationInput,
  type DeclarerPerturbationResult,
} from '@/engine/perturbations.engine';

interface UsePerturbationEngineReturn {
  loading: boolean;
  resultat: DeclarerPerturbationResult | null;
  declarerPerturbation: (input: DeclarerPerturbationInput) => Promise<DeclarerPerturbationResult | null>;
  annulerPerturbation: (perturbation_id: string) => Promise<void>;
}

export function usePerturbationEngine(): UsePerturbationEngineReturn {
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState<DeclarerPerturbationResult | null>(null);

  const declarerPerturbation = useCallback(
    async (input: DeclarerPerturbationInput): Promise<DeclarerPerturbationResult | null> => {
      setLoading(true);
      setResultat(null);
      try {
        const result = await engineDeclarer(input);
        setResultat(result);

        // Toast récapitulatif
        if (result.seances_annulees === 0) {
          toast.info('Perturbation déclarée. Aucune séance planifiée sur cette période.');
        } else {
          const uesLabel =
            result.ues_affectees.length > 0
              ? ` (${result.ues_affectees.join(', ')})`
              : '';
          toast.warning(
            `${result.seances_annulees} séance${result.seances_annulees > 1 ? 's' : ''} annulée${result.seances_annulees > 1 ? 's' : ''}${uesLabel}. Une alerte a été créée.`,
          );
          if (result.documents_obsoletes > 0) {
            toast.info(
              `${result.documents_obsoletes} document${result.documents_obsoletes > 1 ? 's' : ''} marqué${result.documents_obsoletes > 1 ? 's' : ''} obsolète${result.documents_obsoletes > 1 ? 's' : ''}.`,
            );
          }
        }

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        console.error('[usePerturbationEngine] declarerPerturbation:', msg);
        toast.error(`Erreur moteur perturbation : ${msg}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const annulerPerturbation = useCallback(async (perturbation_id: string): Promise<void> => {
    setLoading(true);
    try {
      await engineAnnuler(perturbation_id);
      toast.success('Perturbation annulée. Les séances ont été réactivées.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[usePerturbationEngine] annulerPerturbation:', msg);
      toast.error(`Erreur annulation : ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, resultat, declarerPerturbation, annulerPerturbation };
}
