/**
 * conflits.engine.ts
 * Moteur de détection de conflits pour les séances (Departo)
 * Tous les conflits sont détectés via des requêtes Supabase temps réel.
 */

import { supabase } from '@/integrations/supabase/client';
import { isSeanceCancelled } from '@/lib/perturbationUtils';
import type { Perturbation } from '@/components/perturbations/PerturbationFormDialog';

// ============================================================
// Types publics
// ============================================================

export type ConflitType =
  | 'salle_occupee'
  | 'salle_trop_petite'
  | 'enseignant_indispo'
  | 'enseignant_pris'
  | 'groupe_pris'
  | 'perturbation'
  | 'volume_depasse';

export interface Conflit {
  type: ConflitType;
  bloquant: boolean;
  message: string;
}

export interface VerificationResult {
  peutSauvegarder: boolean;
  conflits: Conflit[];
}

export interface VerifierConflitsInput {
  seance_date: string;        // 'YYYY-MM-DD'
  start_time: string;         // 'HH:MM:SS'
  end_time: string;           // 'HH:MM:SS'
  salle_id: string | null;
  enseignant_id: string;
  group_name: string;
  ue_id: string;
  department_id: string;
  type_seance?: 'CM' | 'TD' | 'TP';
  seance_id_exclu?: string;   // ignorer la séance en cours de modification
}

// ============================================================
// Helper — chevauchement de créneaux
// ============================================================

/**
 * Renvoie true si [startA, endA[ chevauche [startB, endB[
 * Format attendu : 'HH:MM:SS' ou 'HH:MM'
 */
function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(startA) < toMin(endB) && toMin(endA) > toMin(startB);
}

/**
 * Renvoie le jour de la semaine (0 = dimanche … 6 = samedi) d'une date 'YYYY-MM-DD'
 */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

// ============================================================
// Conflit 1 — Salle occupée
// ============================================================

async function checkSalleOccupee(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  if (!input.salle_id) return null;

  const { data: conflict } = await supabase
    .from('seances')
    .select('id, group_name, ue_id, unites_enseignement:ue_id(name)')
    .eq('salle_id', input.salle_id)
    .eq('seance_date', input.seance_date)
    .neq('id', input.seance_id_exclu ?? '00000000-0000-0000-0000-000000000000')
    .not('end_time', 'lte', input.start_time)
    .not('start_time', 'gte', input.end_time)
    .maybeSingle();

  if (!conflict) return null;

  const { data: salle } = await supabase
    .from('salles')
    .select('name')
    .eq('id', input.salle_id)
    .maybeSingle();

  const ueName =
    (conflict as any).unites_enseignement?.name ?? conflict.ue_id;

  return {
    type: 'salle_occupee',
    bloquant: true,
    message: `La salle ${salle?.name ?? ''} est déjà occupée ce créneau (${ueName} – ${conflict.group_name})`,
  };
}

// ============================================================
// Conflit 2 — Salle trop petite
// ============================================================

async function checkSalleTropPetite(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  if (!input.salle_id) return null;

  const [{ data: salle }, { data: effectif }] = await Promise.all([
    supabase
      .from('salles')
      .select('name, capacity')
      .eq('id', input.salle_id)
      .maybeSingle(),
    supabase
      .from('effectifs')
      .select('student_count')
      .eq('group_name', input.group_name)
      .eq('department_id', input.department_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!salle || !effectif) return null;
  if (effectif.student_count <= salle.capacity) return null;

  return {
    type: 'salle_trop_petite',
    bloquant: true,
    message: `La salle ${salle.name} (cap. ${salle.capacity}) est trop petite pour ${input.group_name} (${effectif.student_count} étudiants)`,
  };
}

// ============================================================
// Conflit 3 — Enseignant indisponible
// ============================================================

async function checkEnseignantIndispo(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  const dayOfWeek = getDayOfWeek(input.seance_date);

  const { data: dispos } = await supabase
    .from('enseignant_disponibilites')
    .select('time_slot, status')
    .eq('enseignant_id', input.enseignant_id)
    .eq('day_of_week', dayOfWeek)
    .eq('status', 'indisponible');

  if (!dispos || dispos.length === 0) return null;

  // time_slot peut être 'HH:MM-HH:MM' ou 'HH:MM:SS-HH:MM:SS'
  const hasOverlap = dispos.some((d) => {
    const parts = d.time_slot.split('-');
    if (parts.length < 2) return false;
    return timesOverlap(input.start_time, input.end_time, parts[0], parts[1]);
  });

  if (!hasOverlap) return null;

  const { data: ens } = await supabase
    .from('enseignants')
    .select('first_name, last_name')
    .eq('id', input.enseignant_id)
    .maybeSingle();

  const nom = ens ? `${ens.first_name} ${ens.last_name}` : 'Cet enseignant';

  return {
    type: 'enseignant_indispo',
    bloquant: true,
    message: `${nom} a indiqué être indisponible sur ce créneau`,
  };
}

// ============================================================
// Conflit 4 — Enseignant déjà pris
// ============================================================

async function checkEnseignantPris(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  const { data: conflict } = await supabase
    .from('seances')
    .select('id, group_name, ue_id, unites_enseignement:ue_id(name)')
    .eq('enseignant_id', input.enseignant_id)
    .eq('seance_date', input.seance_date)
    .neq('id', input.seance_id_exclu ?? '00000000-0000-0000-0000-000000000000')
    .not('end_time', 'lte', input.start_time)
    .not('start_time', 'gte', input.end_time)
    .maybeSingle();

  if (!conflict) return null;

  const { data: ens } = await supabase
    .from('enseignants')
    .select('first_name, last_name')
    .eq('id', input.enseignant_id)
    .maybeSingle();

  const nom = ens ? `${ens.first_name} ${ens.last_name}` : 'Cet enseignant';
  const ueName =
    (conflict as any).unites_enseignement?.name ?? conflict.ue_id;

  return {
    type: 'enseignant_pris',
    bloquant: true,
    message: `${nom} a déjà une séance ce créneau (${ueName} – ${conflict.group_name})`,
  };
}

// ============================================================
// Conflit 5 — Groupe déjà pris
// ============================================================

async function checkGroupePris(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  const { data: conflict } = await supabase
    .from('seances')
    .select('id, ue_id, unites_enseignement:ue_id(name)')
    .eq('group_name', input.group_name)
    .eq('seance_date', input.seance_date)
    .neq('id', input.seance_id_exclu ?? '00000000-0000-0000-0000-000000000000')
    .not('end_time', 'lte', input.start_time)
    .not('start_time', 'gte', input.end_time)
    .maybeSingle();

  if (!conflict) return null;

  const ueName =
    (conflict as any).unites_enseignement?.name ?? conflict.ue_id;

  return {
    type: 'groupe_pris',
    bloquant: true,
    message: `Le groupe ${input.group_name} a déjà une séance ce créneau (${ueName})`,
  };
}

// ============================================================
// Conflit 6 — Perturbation active
// ============================================================

async function checkPerturbation(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  const { data: perturbations } = await supabase
    .from('perturbations')
    .select('*')
    .eq('department_id', input.department_id)
    .lte('start_date', input.seance_date)
    .gte('end_date', input.seance_date);

  if (!perturbations || perturbations.length === 0) return null;

  const isCancelled = isSeanceCancelled(
    { seance_date: input.seance_date, group_name: input.group_name },
    perturbations as Perturbation[],
  );

  if (!isCancelled) return null;

  const p = perturbations[0];
  const typeLabel: Record<string, string> = {
    greve: 'Grève',
    jour_ferie: 'Jour férié',
    fermeture_administrative: 'Fermeture administrative',
    intemperies: 'Intempéries',
  };

  return {
    type: 'perturbation',
    bloquant: true,
    message: `Ce créneau tombe sur une perturbation (${typeLabel[p.type] ?? p.type} du ${p.start_date} au ${p.end_date})`,
  };
}

// ============================================================
// Conflit 7 — Volume horaire dépassé (avertissement)
// ============================================================

async function checkVolumeDepasse(
  input: VerifierConflitsInput,
): Promise<Conflit | null> {
  if (!input.type_seance) return null;

  const [{ data: ue }, { data: seances }] = await Promise.all([
    supabase
      .from('unites_enseignement')
      .select('name, volume_cm, volume_td, volume_tp')
      .eq('id', input.ue_id)
      .maybeSingle(),
    supabase
      .from('seances')
      .select('start_time, end_time, type')
      .eq('ue_id', input.ue_id)
      .eq('department_id', input.department_id)
      .neq('id', input.seance_id_exclu ?? '00000000-0000-0000-0000-000000000000'),
  ]);

  if (!ue || !seances) return null;

  // Calcul des heures déjà planifiées pour ce type
  const toHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };

  const filteredType = input.type_seance;
  const heuresActuelles = seances
    .filter((s) => s.type === filteredType)
    .reduce((acc, s) => acc + toHours(s.start_time, s.end_time), 0);

  // Durée de la nouvelle séance
  const nouvelleDuree = toHours(input.start_time, input.end_time);
  const totalApres = heuresActuelles + nouvelleDuree;

  const volumeMap: Record<string, number> = {
    CM: ue.volume_cm,
    TD: ue.volume_td,
    TP: ue.volume_tp,
  };
  const volumePrevu = volumeMap[filteredType] ?? 0;

  if (volumePrevu === 0 || totalApres <= volumePrevu) return null;

  return {
    type: 'volume_depasse',
    bloquant: false,
    message: `Attention : ${ue.name} dépasserait son volume prévu en ${filteredType} (${totalApres.toFixed(1)}h / ${volumePrevu}h prévu)`,
  };
}

// ============================================================
// Fonction principale exportée
// ============================================================

export async function verifierConflitsSeance(
  input: VerifierConflitsInput,
): Promise<VerificationResult> {
  // Lancer tous les checks en parallèle
  const resultats = await Promise.allSettled([
    checkSalleOccupee(input),
    checkSalleTropPetite(input),
    checkEnseignantIndispo(input),
    checkEnseignantPris(input),
    checkGroupePris(input),
    checkPerturbation(input),
    checkVolumeDepasse(input),
  ]);

  const conflits: Conflit[] = resultats
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((c): c is Conflit => c !== null);

  const peutSauvegarder = !conflits.some((c) => c.bloquant);

  return { peutSauvegarder, conflits };
}
