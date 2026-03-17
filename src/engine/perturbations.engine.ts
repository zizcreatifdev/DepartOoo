/**
 * perturbations.engine.ts
 * Moteur d'impact automatique lors de la déclaration / annulation d'une perturbation.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types
// ============================================================

export interface DeclarerPerturbationInput {
  id: string;                         // id déjà inséré en base
  department_id: string;
  start_date: string;                 // 'YYYY-MM-DD'
  end_date: string;
  affected_groups: string[] | null;
  affected_levels: string[] | null;
  academic_year: string;
}

export interface DeclarerPerturbationResult {
  seances_annulees: number;
  ues_affectees: string[];
  documents_obsoletes: number;
}

// ============================================================
// ÉTAPE 1 — Récupérer et marquer les séances annulées
// ============================================================

async function annulerSeances(input: DeclarerPerturbationInput): Promise<{
  seancesIds: string[];
  enseignantHeures: Map<string, number>;
  ueIds: Set<string>;
}> {
  // Construire la requête de sélection
  let query = supabase
    .from('seances')
    .select('id, enseignant_id, ue_id, start_time, end_time')
    .eq('department_id', input.department_id)
    .gte('seance_date', input.start_date)
    .lte('seance_date', input.end_date)
    .eq('is_cancelled', false);

  // Filtrer par groupes si spécifiés
  if (input.affected_groups && input.affected_groups.length > 0) {
    query = query.in('group_name', input.affected_groups);
  }

  const { data: seancesAnnulees, error: selectError } = await query;

  if (selectError) throw new Error(`Erreur sélection séances: ${selectError.message}`);
  if (!seancesAnnulees || seancesAnnulees.length === 0) {
    return { seancesIds: [], enseignantHeures: new Map(), ueIds: new Set() };
  }

  const seancesIds = seancesAnnulees.map(s => s.id);

  // Calculer heures perdues par enseignant
  const enseignantHeures = new Map<string, number>();
  const ueIds = new Set<string>();

  const toHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };

  for (const s of seancesAnnulees) {
    ueIds.add(s.ue_id);
    const heures = toHours(s.start_time, s.end_time);
    enseignantHeures.set(
      s.enseignant_id,
      (enseignantHeures.get(s.enseignant_id) ?? 0) + heures,
    );
  }

  // Marquer toutes les séances comme annulées
  const { error: updateError } = await supabase
    .from('seances')
    .update({ is_cancelled: true, perturbation_id: input.id })
    .in('id', seancesIds);

  if (updateError) throw new Error(`Erreur mise à jour séances: ${updateError.message}`);

  return { seancesIds, enseignantHeures, ueIds };
}

// ============================================================
// ÉTAPE 2 — Corriger les heures des enseignants
// ============================================================

async function corrigerHeuresEnseignants(
  enseignantHeures: Map<string, number>,
): Promise<void> {
  if (enseignantHeures.size === 0) return;

  const updates = Array.from(enseignantHeures.entries());

  await Promise.all(
    updates.map(async ([enseignantId, heuresPerdues]) => {
      // Lire hours_done actuel pour ne pas descendre sous 0
      const { data: ens } = await supabase
        .from('enseignants')
        .select('hours_done')
        .eq('id', enseignantId)
        .maybeSingle();

      if (!ens) return;

      const newHours = Math.max(0, (ens.hours_done ?? 0) - heuresPerdues);

      await supabase
        .from('enseignants')
        .update({ hours_done: newHours })
        .eq('id', enseignantId);
    }),
  );
}

// ============================================================
// ÉTAPE 3 — Marquer documents obsolètes
// ============================================================

async function marquerDocumentsObsoletes(
  department_id: string,
  academic_year: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('documents')
    .update({ status: 'obsolete' })
    .eq('department_id', department_id)
    .eq('academic_year', academic_year)
    .eq('status', 'actif')
    .in('type', ['emploi_du_temps', 'liste_presence'])
    .select('id');

  if (error) {
    console.error('Erreur marquage documents:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

// ============================================================
// ÉTAPE 4 — Créer une alerte
// ============================================================

async function creerAlerte(
  input: DeclarerPerturbationInput,
  nbSeances: number,
  ueNames: string[],
): Promise<void> {
  if (nbSeances === 0) return;

  const listeUes = ueNames.length > 0 ? ueNames.join(', ') : 'inconnues';
  const message = `${nbSeances} séance${nbSeances > 1 ? 's' : ''} annulée${nbSeances > 1 ? 's' : ''}. Heures à rattraper sur : ${listeUes}`;

  await supabase.from('alertes').insert({
    department_id: input.department_id,
    type: 'heures_rattraper',
    message,
    reference_id: input.id,
    reference_type: 'perturbation',
  });
}

// ============================================================
// Fonction principale : declarerPerturbation
// ============================================================

export async function declarerPerturbation(
  input: DeclarerPerturbationInput,
): Promise<DeclarerPerturbationResult> {
  // Étape 1 — annuler les séances
  const { seancesIds, enseignantHeures, ueIds } = await annulerSeances(input);

  // Étape 2 — corriger heures enseignants (en parallèle avec étapes 3)
  const [, documentsObsoletes] = await Promise.all([
    corrigerHeuresEnseignants(enseignantHeures),
    marquerDocumentsObsoletes(input.department_id, input.academic_year),
  ]);

  // Récupérer les noms des UEs affectées
  let ueNames: string[] = [];
  if (ueIds.size > 0) {
    const { data: ues } = await supabase
      .from('unites_enseignement')
      .select('name')
      .in('id', Array.from(ueIds));
    ueNames = (ues ?? []).map(u => u.name);
  }

  // Étape 4 — créer l'alerte
  await creerAlerte(input, seancesIds.length, ueNames);

  return {
    seances_annulees: seancesIds.length,
    ues_affectees: ueNames,
    documents_obsoletes: documentsObsoletes,
  };
}

// ============================================================
// Annulation d'une perturbation
// ============================================================

export async function annulerPerturbation(perturbation_id: string): Promise<void> {
  // Récupérer les séances concernées avant de les réactiver
  const { data: seancesAnnulees } = await supabase
    .from('seances')
    .select('id, enseignant_id, start_time, end_time')
    .eq('perturbation_id', perturbation_id)
    .eq('is_cancelled', true);

  if (!seancesAnnulees || seancesAnnulees.length === 0) return;

  // Réactiver les séances
  await supabase
    .from('seances')
    .update({ is_cancelled: false, perturbation_id: null })
    .eq('perturbation_id', perturbation_id);

  // Recalculer hours_done pour chaque enseignant concerné
  const enseignantIds = [...new Set(seancesAnnulees.map(s => s.enseignant_id))];

  const toHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };

  await Promise.all(
    enseignantIds.map(async (enseignantId) => {
      // Heures à restituer
      const heuresARestituer = seancesAnnulees
        .filter(s => s.enseignant_id === enseignantId)
        .reduce((acc, s) => acc + toHours(s.start_time, s.end_time), 0);

      // Recalculer depuis la table seances (source de vérité)
      const { data: toutesSeances } = await supabase
        .from('seances')
        .select('start_time, end_time')
        .eq('enseignant_id', enseignantId)
        .eq('is_cancelled', false);

      const totalHeures = (toutesSeances ?? []).reduce(
        (acc, s) => acc + toHours(s.start_time, s.end_time),
        0,
      );

      await supabase
        .from('enseignants')
        .update({ hours_done: Math.max(0, totalHeures) })
        .eq('id', enseignantId);
    }),
  );
}
