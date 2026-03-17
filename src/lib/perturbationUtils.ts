import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";

/**
 * Séance minimale acceptée par isSeanceCancelled.
 * Le champ is_cancelled est optionnel pour rétrocompatibilité.
 */
export interface SeanceForCancelCheck {
  seance_date: string;
  group_name: string;
  is_cancelled?: boolean;   // champ DB ajouté par migration 021
}

/**
 * Vérifie si une séance est annulée.
 * Priorité : si is_cancelled = true en base → annulée directement.
 * Fallback : vérification par plage de dates de perturbation (pour les séances
 * antérieures à la migration ou les checks temps réel dans le moteur de conflits).
 */
export function isSeanceCancelled(
  seance: SeanceForCancelCheck,
  perturbations: Perturbation[],
): boolean {
  // Vérification directe via le champ DB (source de vérité après migration 021)
  if (seance.is_cancelled === true) return true;

  // Fallback : vérification par plage de dates
  return perturbations.some((p) => {
    // Date check
    if (seance.seance_date < p.start_date || seance.seance_date > p.end_date) return false;

    // Group check: if affected_groups is empty, all groups are affected
    if (p.affected_groups && p.affected_groups.length > 0) {
      if (!p.affected_groups.includes(seance.group_name)) return false;
    }

    return true;
  });
}

/**
 * Get all dates affected by perturbations (as yyyy-MM-dd strings)
 */
export function getPerturbationDates(perturbations: Perturbation[]): Set<string> {
  const dates = new Set<string>();
  for (const p of perturbations) {
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.add(d.toISOString().split("T")[0]);
    }
  }
  return dates;
}
