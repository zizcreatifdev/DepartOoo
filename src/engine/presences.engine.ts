/**
 * presences.engine.ts
 * Moteur de traitement post-saisie des présences.
 * - Détecte les dépassements de seuil d'absences → exclusion automatique + alerte
 * - Détecte les étudiants proches du seuil → alerte préventive
 * - Marque les étudiants abandonnés
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// afterSaisiePresences
// ============================================================

/**
 * À appeler après chaque sauvegarde de présences pour une séance.
 * Calcule les compteurs d'absences NJ par étudiant et déclenche
 * les actions nécessaires (exclusion, alertes).
 */
export async function afterSaisiePresences(
  seance_id: string,
  department_id: string,
  academic_year: string,
): Promise<void> {
  // 1. Récupérer les infos de la séance
  const { data: seanceData } = await supabase
    .from('seances')
    .select('ue_id, type, group_name')
    .eq('id', seance_id)
    .single();

  if (!seanceData) return;

  const { ue_id, type: seanceType, group_name } = seanceData;

  // 2. Récupérer les seuils d'absences du département
  const { data: settingsData } = await supabase
    .from('absence_settings')
    .select('threshold_cm, threshold_td, threshold_tp')
    .eq('department_id', department_id)
    .maybeSingle();

  const threshold =
    seanceType === 'CM' ? (settingsData?.threshold_cm ?? 3)
    : seanceType === 'TD' ? (settingsData?.threshold_td ?? 3)
    : (settingsData?.threshold_tp ?? 3);

  // 3. IDs de toutes les séances de cette UE + type (même département)
  const { data: ueSeancesData } = await supabase
    .from('seances')
    .select('id')
    .eq('department_id', department_id)
    .eq('ue_id', ue_id)
    .eq('type', seanceType);

  const ueSeanceIds = (ueSeancesData ?? []).map(s => s.id);
  if (ueSeanceIds.length === 0) return;

  // 4. Étudiants actifs du groupe concerné
  const { data: studentsData } = await supabase
    .from('students')
    .select('id')
    .eq('department_id', department_id)
    .eq('group_name', group_name)
    .eq('is_active', true);

  const studentIds = (studentsData ?? []).map(s => s.id);
  if (studentIds.length === 0) return;

  // 5. Compter les absences NJ par étudiant pour cette UE + type
  const { data: presencesData } = await supabase
    .from('presences')
    .select('student_id')
    .eq('status', 'absent_non_justifie')
    .in('seance_id', ueSeanceIds)
    .in('student_id', studentIds);

  const absCountMap: Record<string, number> = {};
  (presencesData ?? []).forEach(p => {
    absCountMap[p.student_id] = (absCountMap[p.student_id] ?? 0) + 1;
  });

  // 6. Traiter chaque étudiant
  for (const studentId of studentIds) {
    const count = absCountMap[studentId] ?? 0;

    if (count >= threshold) {
      // Vérifier si l'exclusion existe déjà pour cette UE + année
      const { data: existingExclusion } = await supabase
        .from('student_exclusions' as any)
        .select('id')
        .eq('student_id', studentId)
        .eq('ue_id', ue_id)
        .eq('academic_year', academic_year)
        .maybeSingle();

      if (!existingExclusion) {
        // Insérer l'exclusion
        await supabase.from('student_exclusions' as any).insert({
          student_id: studentId,
          ue_id,
          department_id,
          academic_year,
          nb_absences: count,
        });

        // Mettre à jour le statut de l'étudiant
        await supabase
          .from('students')
          .update({ statut_exclusion: 'exclu_absences' } as any)
          .eq('id', studentId);

        // Insérer une alerte exclusion
        await supabase.from('alertes').insert({
          department_id,
          type: 'exclusion_automatique',
          message: `Étudiant exclu automatiquement — ${count}/${threshold} absences NJ en ${seanceType} (UE).`,
          reference_id: studentId,
          reference_type: 'student',
        });
      }
    } else if (count === threshold - 1 && count > 0) {
      // Vérifier si une alerte "proche seuil" NON LUE existe déjà pour cet étudiant.
      // On filtre lue = false : si l'admin a lu l'alerte précédente et qu'il y a
      // une nouvelle absence, on recrée une alerte.
      const { data: existingAlerte } = await supabase
        .from('alertes')
        .select('id')
        .eq('department_id', department_id)
        .eq('type', 'absence_proche_seuil')
        .eq('reference_id', studentId)
        .eq('lue', false)
        .maybeSingle();

      if (!existingAlerte) {
        await supabase.from('alertes').insert({
          department_id,
          type: 'absence_proche_seuil',
          message: `Étudiant proche du seuil d'exclusion — ${count}/${threshold} absences NJ en ${seanceType}.`,
          reference_id: studentId,
          reference_type: 'student',
        });
      }
    }
  }
}

// ============================================================
// marquerAbandon
// ============================================================

/**
 * Marque un étudiant comme abandonné :
 * - désactive son compte (is_active = false)
 * - met à jour statut_exclusion = 'abandonne'
 */
export async function marquerAbandon(student_id: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ is_active: false, statut_exclusion: 'abandonne' } as any)
    .eq('id', student_id);

  if (error) throw new Error(error.message);
}
