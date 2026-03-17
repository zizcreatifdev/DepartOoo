/**
 * invitations.service.ts
 * Gestion des invitations et des limites d'offre.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types
// ============================================================

export type Offre = 'starter' | 'pro' | 'universite';

export interface InvitationResult {
  success: boolean;
  user_id?: string;
  error?: string;
  message?: string;
}

export interface LimitesOffre {
  offre: Offre;
  nb_assistants: number;
  nb_enseignants: number;
  max_assistants: number;
  max_enseignants: number;
}

// ── Plafonds par offre ──────────────────────────────────────
const MAX_ASSISTANTS: Record<Offre, number> = {
  starter:    1,
  pro:        2,
  universite: Infinity,
};

const MAX_ENSEIGNANTS: Record<Offre, number> = {
  starter:    30,
  pro:        60,
  universite: Infinity,
};

// ============================================================
// inviterAssistant
// ============================================================

/**
 * Invite un assistant par email.
 * Appelle l'Edge Function `invite-assistant` qui vérifie la limite
 * selon l'offre avant d'envoyer l'email Supabase Auth.
 */
export async function inviterAssistant(
  email: string,
  full_name: string,
  department_id: string,
): Promise<InvitationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('invite-assistant', {
      body: { email, full_name, department_id },
    });

    if (error) {
      // Extraire le message métier du corps de l'erreur si disponible
      const body = (error as any)?.context?.json ?? {};
      return {
        success: false,
        error: body.error ?? error.message,
        message: body.message,
      };
    }

    return {
      success: data?.success ?? false,
      user_id: data?.user_id,
      error: data?.error,
      message: data?.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erreur réseau' };
  }
}

// ============================================================
// inviterEnseignant
// ============================================================

/**
 * Invite un enseignant par email.
 * Appelle l'Edge Function `invite-teacher` qui vérifie la limite
 * selon l'offre avant d'envoyer l'email Supabase Auth.
 */
export async function inviterEnseignant(
  email: string,
  full_name: string,
  enseignant_id: string,
  department_id: string,
): Promise<InvitationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('invite-teacher', {
      body: { email, full_name, enseignant_id, department_id },
    });

    if (error) {
      const body = (error as any)?.context?.json ?? {};
      return {
        success: false,
        error: body.error ?? error.message,
        message: body.message,
      };
    }

    return {
      success: data?.success ?? false,
      user_id: data?.user_id,
      error: data?.error,
      message: data?.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erreur réseau' };
  }
}

// ============================================================
// getLimitesOffre
// ============================================================

/**
 * Retourne l'offre actuelle du département et les compteurs membres
 * avec les plafonds correspondants.
 */
export async function getLimitesOffre(
  department_id: string,
): Promise<LimitesOffre> {
  // Récupérer l'offre du département
  const { data: deptData } = await (supabase as any)
    .from('departments')
    .select('offre')
    .eq('id', department_id)
    .single();

  const offre: Offre = (deptData?.offre as Offre) ?? 'starter';

  // Récupérer les compteurs depuis la vue
  const { data: countsData } = await (supabase as any)
    .from('department_member_counts')
    .select('nb_assistants, nb_enseignants')
    .eq('department_id', department_id)
    .maybeSingle();

  const nb_assistants  = Number(countsData?.nb_assistants  ?? 0);
  const nb_enseignants = Number(countsData?.nb_enseignants ?? 0);

  return {
    offre,
    nb_assistants,
    nb_enseignants,
    max_assistants:  MAX_ASSISTANTS[offre]  ?? 1,
    max_enseignants: MAX_ENSEIGNANTS[offre] ?? 30,
  };
}
