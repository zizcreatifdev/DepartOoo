/**
 * saveDocument.ts
 * Helper partagé pour enregistrer un document généré dans la table 'documents'.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SaveDocumentParams {
  type: string;
  title: string;
  file_name: string;
  department_id: string;
  academic_year: string;
  generated_by_name?: string | null;
  related_enseignant_id?: string | null;
  related_ue_id?: string | null;
  related_level?: string | null;
}

/**
 * Insère un enregistrement dans la table 'documents' après génération d'un PDF.
 * Non-bloquant : les erreurs sont juste loguées.
 */
export async function saveDocumentRecord(params: SaveDocumentParams): Promise<void> {
  const { error } = await supabase.from('documents').insert({
    ...params,
    status: 'actif',
  });

  if (error) {
    console.error('[saveDocumentRecord]', error.message);
  }
}
