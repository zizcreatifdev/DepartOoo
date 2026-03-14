import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";

/**
 * Check if a seance falls within a perturbation date range and matches affected groups/levels.
 */
export function isSeanceCancelled(
  seance: { seance_date: string; group_name: string },
  perturbations: Perturbation[]
): boolean {
  return perturbations.some(p => {
    // Date check
    if (seance.seance_date < p.start_date || seance.seance_date > p.end_date) return false;

    // Group check: if affected_groups is empty, all groups are affected
    if (p.affected_groups && p.affected_groups.length > 0) {
      if (!p.affected_groups.includes(seance.group_name)) return false;
    }

    // Level check is harder without seance having level info, so we skip it here
    // (levels are checked at the perturbation declaration level)

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
