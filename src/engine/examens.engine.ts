/**
 * examens.engine.ts
 * Moteur métier du module Examens.
 * - Génération de listes de convocation filtrées (normale / rattrapage)
 * - Vérification des sujets en retard avec création d'alertes
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types
// ============================================================

export interface StudentConvocation {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  group_name: string;
  level: string;
}

// ============================================================
// genererListeConvocation
// ============================================================

/**
 * Génère la liste des étudiants à convoquer pour un examen.
 *
 * Session 'normale' :
 *   - Étudiants actifs du département au niveau de l'UE
 *   - Excluant les abandonnés (statut_exclusion = 'abandonne')
 *   - Excluant les étudiants dans student_exclusions pour cette UE + academic_year
 *
 * Session 'rattrapage' :
 *   - Étudiants ayant obtenu le statut 'rattrapage' dans examen_resultats
 *     pour un examen de la même UE en session_type = 'normale'
 *   - Excluant les abandonnés et exclu_absences
 */
export async function genererListeConvocation(
  _examen_id: string,
  ue_id: string,
  session_type: string,
  department_id: string,
  academic_year: string,
): Promise<StudentConvocation[]> {
  if (session_type === 'rattrapage') {
    return _genererListeRattrapage(ue_id, department_id, academic_year);
  }
  return _genererListeNormale(ue_id, department_id, academic_year);
}

// ------ Normale ------

async function _genererListeNormale(
  ue_id: string,
  department_id: string,
  academic_year: string,
): Promise<StudentConvocation[]> {
  // 1. Niveau de l'UE
  const { data: ueData } = await supabase
    .from('unites_enseignement')
    .select('id, maquettes(level)')
    .eq('id', ue_id)
    .maybeSingle();

  const level: string | undefined = (ueData?.maquettes as any)?.level;

  // 2. Étudiants actifs du département + niveau
  let query = supabase
    .from('students')
    .select('id, first_name, last_name, student_number, group_name, level, statut_exclusion')
    .eq('department_id', department_id)
    .eq('is_active', true);

  if (level) query = query.eq('level', level);

  const { data: studentsRaw } = await query.order('last_name');
  const allStudents: any[] = studentsRaw ?? [];

  // 3. Exclusions par absences pour cette UE + année
  const { data: exclusionsData } = await supabase
    .from('student_exclusions' as any)
    .select('student_id')
    .eq('ue_id', ue_id)
    .eq('academic_year', academic_year);

  const excludedAbsencesIds = new Set<string>(
    (exclusionsData ?? []).map((e: any) => e.student_id),
  );

  // 4. Filtrer abandonnés + exclu par absences
  return allStudents
    .filter(s =>
      s.statut_exclusion !== 'abandonne' &&
      s.statut_exclusion !== 'exclu_absences' &&
      !excludedAbsencesIds.has(s.id),
    )
    .map(s => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      student_number: s.student_number,
      group_name: s.group_name,
      level: s.level,
    }));
}

// ------ Rattrapage ------

async function _genererListeRattrapage(
  ue_id: string,
  department_id: string,
  academic_year: string,
): Promise<StudentConvocation[]> {
  // 1. Examens normaux pour cette UE + département + année
  const { data: normaleExamens } = await supabase
    .from('examens')
    .select('id')
    .eq('ue_id', ue_id)
    .eq('department_id', department_id)
    .eq('academic_year', academic_year)
    .eq('session_type', 'normale');

  const normaleIds = (normaleExamens ?? []).map(e => e.id);
  if (normaleIds.length === 0) return [];

  // 2. Étudiants ayant statut 'rattrapage' dans les résultats
  const { data: resultatsData } = await supabase
    .from('examen_resultats')
    .select('student_id')
    .in('examen_id', normaleIds)
    .eq('statut', 'rattrapage');

  const studentIds = [...new Set((resultatsData ?? []).map((r: any) => r.student_id))];
  if (studentIds.length === 0) return [];

  // 3. Récupérer ces étudiants (actifs seulement)
  const { data: studentsRaw } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_number, group_name, level, statut_exclusion')
    .in('id', studentIds)
    .eq('is_active', true)
    .order('last_name');

  // 4. Exclure abandonnés et exclu_absences
  return (studentsRaw ?? [])
    .filter((s: any) =>
      s.statut_exclusion !== 'abandonne' &&
      s.statut_exclusion !== 'exclu_absences',
    )
    .map((s: any) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      student_number: s.student_number,
      group_name: s.group_name,
      level: s.level,
    }));
}

// ============================================================
// checkSujetsEnRetard
// ============================================================

/**
 * Vérifie les sujets dont la deadline est dépassée et crée
 * une alerte 'sujet_retard' pour chacun (sans doublon).
 */
export async function checkSujetsEnRetard(department_id: string): Promise<void> {
  // 1. IDs des examens du département
  const { data: examensData } = await supabase
    .from('examens')
    .select('id')
    .eq('department_id', department_id);

  const examenIds = (examensData ?? []).map(e => e.id);
  if (examenIds.length === 0) return;

  // 2. Sujets en retard : deadline dépassée + pas de fichier
  const { data: retardsData } = await supabase
    .from('examen_sujets')
    .select('id, examen_id')
    .in('examen_id', examenIds)
    .lt('deadline', new Date().toISOString())
    .is('file_path', null);

  if (!retardsData || retardsData.length === 0) return;

  // 3. Créer une alerte par sujet en retard (si pas déjà existante)
  for (const sujet of retardsData) {
    const { data: existing } = await supabase
      .from('alertes')
      .select('id')
      .eq('type', 'sujet_retard')
      .eq('reference_id', sujet.id)
      .eq('department_id', department_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('alertes').insert({
        department_id,
        type: 'sujet_retard',
        message: `Un sujet d'examen n'a pas été déposé avant la deadline.`,
        reference_id: sujet.id,
        reference_type: 'examen_sujet',
      });
    }
  }
}
