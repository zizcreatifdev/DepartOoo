/**
 * owner.service.ts
 * Requêtes Supabase pour le dashboard Owner.
 * Nécessite la migration 023_owner_read_policies.sql
 * (politiques SELECT multi-table pour le rôle owner).
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types
// ============================================================

export interface StatsGlobales {
  nb_departements_actifs: number;
  nb_enseignants_total: number;
  nb_seances_ce_mois: number;
  nb_documents_generes: number;
}

export interface DepartementActif {
  id: string;
  name: string;
  university: string;
  onboarding_completed: boolean;
  created_at: string;
  contact_name: string | null;
}

export interface DepartementInactif {
  id: string;
  name: string;
  university: string;
  created_at: string;
  jours_inactif: number;
}

export interface AdoptionModule {
  name: string;
  nb_depts: number;
  total_depts: number;
  taux: number;  // 0–100
}

export interface PipelineEntry {
  id: string;
  statut: 'discussion' | 'demo' | 'essai' | 'converti' | 'perdu';
  note: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  derniere_action: string | null;
  created_at: string;
}

export interface AlerteOwner {
  text: string;
  severity: 'destructive' | 'warning' | 'info';
  count: number;
}

export interface EvolutionInscription {
  month: string;   // 'MMM YYYY' ex: 'Jan 2026'
  count: number;
}

// ============================================================
// Helpers
// ============================================================

function startOfCurrentMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function monthLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

// ============================================================
// 1. Stats globales
// ============================================================

export async function getStatsGlobales(): Promise<StatsGlobales> {
  const fromMonth = startOfCurrentMonth();

  const [
    { count: nb_departements_actifs },
    { count: nb_enseignants_total },
    { count: nb_seances_ce_mois },
    { count: nb_documents_generes },
  ] = await Promise.all([
    supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('onboarding_completed', true),
    supabase
      .from('enseignants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('seances')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromMonth),
    (supabase as any)
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromMonth),
  ]);

  return {
    nb_departements_actifs: nb_departements_actifs ?? 0,
    nb_enseignants_total:   nb_enseignants_total   ?? 0,
    nb_seances_ce_mois:     nb_seances_ce_mois     ?? 0,
    nb_documents_generes:   nb_documents_generes   ?? 0,
  };
}

// ============================================================
// 2. Départements actifs (onboarding = true) + nom du chef
// ============================================================

export async function getDepartementsActifs(): Promise<DepartementActif[]> {
  const [{ data: depts }, { data: chefRoles }] = await Promise.all([
    supabase
      .from('departments')
      .select('id, name, university, onboarding_completed, created_at')
      .eq('onboarding_completed', true)
      .order('name'),
    // Récupérer les profils dont le rôle est 'chef'
    (supabase as any)
      .from('user_roles')
      .select('user_id, role, profiles(full_name, department_id)')
      .eq('role', 'chef'),
  ]);

  // Construire une map department_id → full_name
  const chefByDept: Record<string, string> = {};
  (chefRoles ?? []).forEach((r: any) => {
    const deptId = r.profiles?.department_id;
    if (deptId) chefByDept[deptId] = r.profiles.full_name ?? null;
  });

  return (depts ?? []).map((d: any) => ({
    ...d,
    contact_name: chefByDept[d.id] ?? null,
  }));
}

// ============================================================
// 3. Départements inactifs (aucune séance depuis X jours)
// ============================================================

export async function getDepartementsInactifs(jours = 21): Promise<DepartementInactif[]> {
  const cutoff = new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: allDepts }, { data: recentSeances }] = await Promise.all([
    supabase
      .from('departments')
      .select('id, name, university, created_at')
      .eq('onboarding_completed', true),
    supabase
      .from('seances')
      .select('department_id')
      .gte('created_at', cutoff),
  ]);

  const activeIds = new Set((recentSeances ?? []).map((s: any) => s.department_id));

  return (allDepts ?? [])
    .filter((d: any) => !activeIds.has(d.id))
    .map((d: any) => {
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...d, jours_inactif: daysSinceCreation };
    })
    .sort((a: DepartementInactif, b: DepartementInactif) => b.jours_inactif - a.jours_inactif);
}

// ============================================================
// 4. Taux d'adoption par module (ce mois)
// ============================================================

export async function getAdoptionParModule(): Promise<AdoptionModule[]> {
  const fromMonth = startOfCurrentMonth();

  const [
    { count: totalDepts },
    { data: seanceDepts },
    { data: examenDepts },
    { data: docDepts },
    { data: resultDepts },
  ] = await Promise.all([
    supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('onboarding_completed', true),
    supabase
      .from('seances')
      .select('department_id')
      .gte('created_at', fromMonth),
    supabase
      .from('examens')
      .select('department_id')
      .gte('created_at', fromMonth),
    (supabase as any)
      .from('documents')
      .select('department_id')
      .gte('created_at', fromMonth),
    supabase
      .from('examen_resultats')
      .select('examen_id')
      .gte('created_at', fromMonth),
  ]);

  const total = totalDepts ?? 1;  // éviter division par 0

  const countUnique = (rows: any[] | null, key: string) =>
    new Set((rows ?? []).map((r: any) => r[key])).size;

  const modules: { name: string; count: number }[] = [
    { name: 'Emploi du temps', count: countUnique(seanceDepts, 'department_id') },
    { name: 'Examens',         count: countUnique(examenDepts, 'department_id') },
    { name: 'Notes',           count: resultDepts?.length ? 1 : 0 },  // pas de dept_id direct
    { name: 'Documents',       count: countUnique(docDepts, 'department_id') },
  ];

  return modules.map(m => ({
    name:       m.name,
    nb_depts:   m.count,
    total_depts: total,
    taux:       Math.round((m.count / total) * 100),
  }));
}

// ============================================================
// 5. Pipeline commercial
// ============================================================

export async function getPipelineCommercial(): Promise<PipelineEntry[]> {
  const { data, error } = await (supabase as any)
    .from('pipeline_commercial')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getPipelineCommercial: ${error.message}`);
  return (data ?? []) as PipelineEntry[];
}

export async function addProspect(data: {
  contact_nom: string;
  contact_email?: string;
  note?: string;
}): Promise<void> {
  const { error } = await (supabase as any)
    .from('pipeline_commercial')
    .insert({ ...data, statut: 'discussion', derniere_action: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function updatePipelineStatut(
  id: string,
  statut: PipelineEntry['statut'],
): Promise<void> {
  const { error } = await (supabase as any)
    .from('pipeline_commercial')
    .update({ statut, derniere_action: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updatePipelineNote(id: string, note: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('pipeline_commercial')
    .update({ note, derniere_action: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('pipeline_commercial')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// 6. Alertes owner
// ============================================================

export async function getAlertesOwner(): Promise<AlerteOwner[]> {
  const alertes: AlerteOwner[] = [];

  // a) Départements sans activité depuis 21+ jours
  const inactifs = await getDepartementsInactifs(21);
  if (inactifs.length > 0) {
    alertes.push({
      text: `${inactifs.length} département${inactifs.length > 1 ? 's' : ''} inactif${inactifs.length > 1 ? 's' : ''} depuis plus de 21 jours`,
      severity: 'warning',
      count: inactifs.length,
    });
  }

  // b) Départements bloqués à l'onboarding depuis 7+ jours
  const cutoff7j = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: blockedDepts } = await supabase
    .from('departments')
    .select('id')
    .eq('onboarding_completed', false)
    .lt('created_at', cutoff7j);

  if (blockedDepts && blockedDepts.length > 0) {
    alertes.push({
      text: `${blockedDepts.length} département${blockedDepts.length > 1 ? 's' : ''} bloqué${blockedDepts.length > 1 ? 's' : ''} à l'étape d'onboarding`,
      severity: 'info',
      count: blockedDepts.length,
    });
  }

  return alertes;
}

// ============================================================
// 7. Évolution des inscriptions (départements par mois)
// ============================================================

export async function getEvolutionInscriptions(): Promise<EvolutionInscription[]> {
  const { data } = await supabase
    .from('departments')
    .select('created_at')
    .order('created_at');

  if (!data || data.length === 0) return [];

  // Grouper par mois YYYY-MM
  const byMonth: Record<string, number> = {};
  data.forEach((d: any) => {
    const key = d.created_at.substring(0, 7);  // 'YYYY-MM'
    byMonth[key] = (byMonth[key] ?? 0) + 1;
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)  // 8 derniers mois
    .map(([key, count]) => ({
      month: monthLabel(key + '-01'),
      count,
    }));
}
