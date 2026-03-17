/**
 * notifications.service.ts
 * Helpers côté frontend pour les notifications WhatsApp et les Edge Functions.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Types
// ============================================================

export interface NotifModifCoursResult {
  success: boolean;
  email_sent: boolean;
  whatsapp_link: string | null;
}

// ============================================================
// Fonctions
// ============================================================

/**
 * Génère un lien wa.me cliquable (sans API Business).
 * Nettoie le numéro (retire '+', espaces, tirets).
 * @param numero - Numéro international (ex: "+213 555 123456" ou "00213555123456")
 * @param message - Message pré-rempli (sera URL-encodé)
 */
export function genererLienWhatsApp(numero: string, message: string): string {
  // Retirer tout sauf chiffres, garder sans le '+'
  const cleaned = numero.replace(/[^\d]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/**
 * Notifie l'enseignant d'une modification de séance via la Edge Function.
 * Retourne le lien WhatsApp généré (à afficher à l'assistant pour clic manuel).
 */
export async function notifierModifCours(
  seance_id: string,
  enseignant_id: string,
): Promise<NotifModifCoursResult> {
  const { data, error } = await supabase.functions.invoke<NotifModifCoursResult>(
    'notification-cours-modifie',
    {
      body: { seance_id, enseignant_id },
    },
  );

  if (error) {
    console.error('[notifications.service] notifierModifCours:', error.message);
    throw new Error(error.message);
  }

  return data ?? { success: false, email_sent: false, whatsapp_link: null };
}
