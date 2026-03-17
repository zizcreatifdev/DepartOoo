/**
 * calcul-notes.engine.ts
 * Moteur de calcul des résultats de promotion Departo.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types exportés
// ============================================================

export type StatutEtudiant = 'admis' | 'ajourné' | 'rattrapage' | 'exclu';

export interface ResultatEtudiant {
  student_id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  group_name: string;
  moyenne: number | null;
  rang: number;
  notes_par_ue: Record<string, number | null>; // ue_id → note finale
  ues_validees: string[];                       // ue_ids
  ues_echouees: string[];                       // ue_ids
  compensee: boolean;
  statut: StatutEtudiant;
}

export interface ResultatsPromotion {
  admis: ResultatEtudiant[];
  ajournes: ResultatEtudiant[];
  rattrapage: ResultatEtudiant[];
  exclus: ResultatEtudiant[];
  stats: {
    total: number;
    nb_admis: number;
    nb_ajournes: number;
    nb_rattrapage: number;
    taux_reussite: number;
    moyenne_promo: number;
  };
}

interface NotesConfig {
  passing_grade: number;
  compensation_enabled: boolean;
  compensation_threshold: number;
}

interface UeInfo {
  id: string;
  name: string;
  coefficient: number;
  credits_ects: number;
}

// ============================================================
// Helper — calcul de la moyenne pondérée
// ============================================================

function calculerMoyenne(
  notesByUe: Record<string, number | null>,
  ues: UeInfo[],
): number | null {
  let totalPondere = 0;
  let totalCoeff = 0;

  for (const ue of ues) {
    const note = notesByUe[ue.id];
    if (note !== null && note !== undefined) {
      totalPondere += note * ue.coefficient;
      totalCoeff += ue.coefficient;
    }
  }

  return totalCoeff > 0 ? totalPondere / totalCoeff : null;
}

// ============================================================
// Helper — déterminer le statut d'un étudiant
// ============================================================

function determinerStatut(
  moyenne: number | null,
  notesByUe: Record<string, number | null>,
  ues: UeInfo[],
  config: NotesConfig,
  estExclu: boolean,
  isRattrapage: boolean,
): { statut: StatutEtudiant; compensee: boolean; ues_validees: string[]; ues_echouees: string[] } {
  if (estExclu) {
    return { statut: 'exclu', compensee: false, ues_validees: [], ues_echouees: ues.map(u => u.id) };
  }

  // Compensation : si la moyenne >= seuil, toutes les UEs sont considérées validées
  const compensee =
    config.compensation_enabled &&
    moyenne !== null &&
    moyenne >= config.compensation_threshold;

  const ues_validees: string[] = [];
  const ues_echouees: string[] = [];

  for (const ue of ues) {
    const note = notesByUe[ue.id];
    if (compensee || (note !== null && note !== undefined && note >= config.passing_grade)) {
      ues_validees.push(ue.id);
    } else {
      ues_echouees.push(ue.id);
    }
  }

  if (ues_validees.length === ues.length || compensee) {
    return { statut: 'admis', compensee, ues_validees, ues_echouees: [] };
  }

  if (isRattrapage) {
    // Après la session rattrapage, plus de rattrapage possible
    return { statut: 'ajourné', compensee: false, ues_validees, ues_echouees };
  }

  // Session normale : rattrapage si moyenne >= 5, ajourné sinon
  if (moyenne !== null && moyenne >= 5) {
    return { statut: 'rattrapage', compensee: false, ues_validees, ues_echouees };
  }

  return { statut: 'ajourné', compensee: false, ues_validees, ues_echouees };
}

// ============================================================
// Fonction principale
// ============================================================

export async function calculerResultatsPromotion(
  department_id: string,
  maquette_id: string,
  session_type: string,
  academic_year: string,
  group_name?: string,
): Promise<ResultatsPromotion> {
  // --- 1. notes_config ---
  const { data: configData } = await supabase
    .from('notes_config')
    .select('passing_grade, compensation_enabled, compensation_threshold')
    .eq('department_id', department_id)
    .maybeSingle();

  const config: NotesConfig = {
    passing_grade: configData?.passing_grade ?? 10,
    compensation_enabled: configData?.compensation_enabled ?? false,
    compensation_threshold: configData?.compensation_threshold ?? 10,
  };

  // --- 2. UEs de la maquette ---
  const { data: uesData } = await supabase
    .from('unites_enseignement')
    .select('id, name, coefficient, credits_ects')
    .eq('maquette_id', maquette_id);

  const ues: UeInfo[] = (uesData ?? []).map(u => ({
    id: u.id,
    name: u.name,
    coefficient: u.coefficient ?? 1,
    credits_ects: u.credits_ects ?? 0,
  }));

  if (ues.length === 0) {
    return {
      admis: [], ajournes: [], rattrapage: [], exclus: [],
      stats: { total: 0, nb_admis: 0, nb_ajournes: 0, nb_rattrapage: 0, taux_reussite: 0, moyenne_promo: 0 },
    };
  }

  // Récupérer le level de la maquette pour filtrer les étudiants
  const { data: maquetteData } = await supabase
    .from('maquettes')
    .select('level')
    .eq('id', maquette_id)
    .maybeSingle();

  const maquetteLevel = maquetteData?.level;

  // --- 3. Étudiants actifs ---
  let studQuery = supabase
    .from('students')
    .select('id, first_name, last_name, student_number, group_name, level')
    .eq('department_id', department_id)
    .eq('is_active', true);

  if (maquetteLevel) studQuery = studQuery.eq('level', maquetteLevel);
  if (group_name)    studQuery = studQuery.eq('group_name', group_name);

  const { data: studentsData } = await studQuery.order('last_name');
  const students = studentsData ?? [];

  if (students.length === 0) {
    return {
      admis: [], ajournes: [], rattrapage: [], exclus: [],
      stats: { total: 0, nb_admis: 0, nb_ajournes: 0, nb_rattrapage: 0, taux_reussite: 0, moyenne_promo: 0 },
    };
  }

  const studentIds = students.map(s => s.id);
  const ueIds = ues.map(u => u.id);
  const isRattrapage = session_type === 'rattrapage';

  // --- 4. Notes ---
  let notesData: { student_id: string; ue_id: string; note: number | null; session_type: string }[] = [];

  if (isRattrapage) {
    // Récupérer les deux sessions pour prendre le MAX
    const { data } = await supabase
      .from('notes')
      .select('student_id, ue_id, note, session_type')
      .eq('department_id', department_id)
      .eq('academic_year', academic_year)
      .in('student_id', studentIds)
      .in('ue_id', ueIds)
      .in('session_type', ['normale', 'rattrapage']);
    notesData = data ?? [];
  } else {
    const { data } = await supabase
      .from('notes')
      .select('student_id, ue_id, note, session_type')
      .eq('department_id', department_id)
      .eq('academic_year', academic_year)
      .eq('session_type', 'normale')
      .in('student_id', studentIds)
      .in('ue_id', ueIds);
    notesData = data ?? [];
  }

  // --- 5. Exclusions ---
  const { data: exclusionsData } = await supabase
    .from('student_exclusions' as any)
    .select('student_id')
    .eq('department_id', department_id)
    .eq('academic_year', academic_year)
    .in('student_id', studentIds);

  const excluIds = new Set<string>(
    (exclusionsData ?? []).map((e: any) => e.student_id),
  );

  // --- 6. Calcul par étudiant ---
  const resultats: ResultatEtudiant[] = [];

  for (const student of students) {
    // Notes effectives : pour le rattrapage, MAX(normale, rattrapage) par UE
    const notesByUe: Record<string, number | null> = {};

    for (const ue of ues) {
      const notesForUe = notesData.filter(
        n => n.student_id === student.id && n.ue_id === ue.id,
      );

      if (notesForUe.length === 0) {
        notesByUe[ue.id] = null;
        continue;
      }

      if (isRattrapage) {
        // MAX de toutes les notes disponibles pour cette UE
        const valeurs = notesForUe
          .map(n => n.note)
          .filter((n): n is number => n !== null);
        notesByUe[ue.id] = valeurs.length > 0 ? Math.max(...valeurs) : null;
      } else {
        const found = notesForUe.find(n => n.session_type === 'normale');
        notesByUe[ue.id] = found?.note ?? null;
      }
    }

    const moyenne = calculerMoyenne(notesByUe, ues);
    const estExclu = excluIds.has(student.id);
    const { statut, compensee, ues_validees, ues_echouees } = determinerStatut(
      moyenne, notesByUe, ues, config, estExclu, isRattrapage,
    );

    resultats.push({
      student_id: student.id,
      student_number: student.student_number,
      first_name: student.first_name,
      last_name: student.last_name,
      group_name: student.group_name,
      moyenne,
      rang: 0, // calculé après tri
      notes_par_ue: notesByUe,
      ues_validees,
      ues_echouees,
      compensee,
      statut,
    });
  }

  // --- 7. Tri et rang pour les admis ---
  const admis = resultats
    .filter(r => r.statut === 'admis')
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))
    .map((r, i) => ({ ...r, rang: i + 1 }));

  const ajournes = resultats
    .filter(r => r.statut === 'ajourné')
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))
    .map((r, i) => ({ ...r, rang: i + 1 }));

  const rattrapage = resultats
    .filter(r => r.statut === 'rattrapage')
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))
    .map((r, i) => ({ ...r, rang: i + 1 }));

  const exclus = resultats
    .filter(r => r.statut === 'exclu')
    .map((r, i) => ({ ...r, rang: i + 1 }));

  // --- 8. Stats ---
  const moyennesValides = admis.map(r => r.moyenne!).filter(m => m !== null);
  const moyenne_promo =
    moyennesValides.length > 0
      ? moyennesValides.reduce((a, b) => a + b, 0) / moyennesValides.length
      : 0;

  const total = resultats.length;
  const nb_admis = admis.length;
  const nb_ajournes = ajournes.length;
  const nb_rattrapage = rattrapage.length;
  const taux_reussite = total > 0 ? (nb_admis / total) * 100 : 0;

  return {
    admis,
    ajournes,
    rattrapage,
    exclus,
    stats: {
      total,
      nb_admis,
      nb_ajournes,
      nb_rattrapage,
      taux_reussite,
      moyenne_promo,
    },
  };
}
