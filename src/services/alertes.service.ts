/**
 * alertes.service.ts
 * Opérations CRUD sur la table alertes.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types
// ============================================================

export interface Alerte {
  id: string;
  department_id: string;
  type: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  lue: boolean;
  created_at: string;
}

export interface CreateAlerteData {
  department_id: string;
  type: string;
  message: string;
  reference_id?: string | null;
  reference_type?: string | null;
}

// ============================================================
// Fonctions
// ============================================================

/**
 * Insère une nouvelle alerte (non lue par défaut).
 */
export async function createAlerte(data: CreateAlerteData): Promise<void> {
  const { error } = await (supabase as any)
    .from('alertes')
    .insert({
      department_id:  data.department_id,
      type:           data.type,
      message:        data.message,
      reference_id:   data.reference_id   ?? null,
      reference_type: data.reference_type ?? null,
      lue:            false,
    });

  if (error) throw new Error(`createAlerte: ${error.message}`);
}

/**
 * Marque une alerte comme lue.
 */
export async function marquerLue(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('alertes')
    .update({ lue: true })
    .eq('id', id);

  if (error) throw new Error(`marquerLue: ${error.message}`);
}

/**
 * Marque toutes les alertes d'un département comme lues.
 */
export async function marquerToutesLues(department_id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('alertes')
    .update({ lue: true })
    .eq('department_id', department_id)
    .eq('lue', false);

  if (error) throw new Error(`marquerToutesLues: ${error.message}`);
}

/**
 * Retourne le nombre d'alertes non lues pour un département.
 */
export async function getNbAlertes(department_id: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('alertes')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', department_id)
    .eq('lue', false);

  if (error) throw new Error(`getNbAlertes: ${error.message}`);
  return count ?? 0;
}

/**
 * Récupère toutes les alertes non lues d'un département, triées par date décroissante.
 */
export async function getAlertesNonLues(department_id: string): Promise<Alerte[]> {
  const { data, error } = await (supabase as any)
    .from('alertes')
    .select('*')
    .eq('department_id', department_id)
    .eq('lue', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getAlertesNonLues: ${error.message}`);
  return (data ?? []) as Alerte[];
}
