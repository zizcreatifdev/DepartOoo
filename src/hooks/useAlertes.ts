/**
 * useAlertes.ts
 * Hook TanStack Query v5 pour les alertes non lues.
 * Rafraîchissement automatique toutes les 30 secondes.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAlertesNonLues,
  marquerLue as svcMarquerLue,
  marquerToutesLues as svcMarquerToutesLues,
  type Alerte,
} from '@/services/alertes.service';

// ============================================================
// Types retournés par le hook
// ============================================================

interface UseAlertesReturn {
  alertes: Alerte[];
  nb_non_lues: number;
  loading: boolean;
  marquerLue: (alerte_id: string) => void;
  marquerToutesLues: () => void;
}

// ============================================================
// Hook
// ============================================================

export function useAlertes(department_id: string | null | undefined): UseAlertesReturn {
  const queryClient = useQueryClient();
  const queryKey = ['alertes', department_id];

  // ---- Fetch ----
  const { data = [], isFetching } = useQuery<Alerte[]>({
    queryKey,
    queryFn: () => {
      if (!department_id) return Promise.resolve([]);
      return getAlertesNonLues(department_id);
    },
    enabled: !!department_id,
    refetchInterval: 30_000,   // rafraîchissement toutes les 30 s
    staleTime: 10_000,
  });

  // ---- Marquer une alerte lue ----
  const mutationLue = useMutation({
    mutationFn: (alerte_id: string) => svcMarquerLue(alerte_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // ---- Marquer toutes lues ----
  const mutationToutesLues = useMutation({
    mutationFn: () => {
      if (!department_id) return Promise.resolve();
      return svcMarquerToutesLues(department_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const marquerLue = useCallback(
    (alerte_id: string) => mutationLue.mutate(alerte_id),
    [mutationLue],
  );

  const marquerToutesLues = useCallback(
    () => mutationToutesLues.mutate(),
    [mutationToutesLues],
  );

  return {
    alertes:     data,
    nb_non_lues: data.length,
    loading:     isFetching,
    marquerLue,
    marquerToutesLues,
  };
}
