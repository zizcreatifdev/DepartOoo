/**
 * documents.service.ts
 * CRUD + Storage pour la table documents.
 */

import { supabase } from '@/integrations/supabase/client';
import type { SaveDocumentParams } from '@/lib/saveDocument';

// ============================================================
// Types
// ============================================================

export interface Document {
  id: string;
  department_id: string;
  type: string;
  title: string;
  file_name: string;
  file_path: string | null;
  status: 'actif' | 'obsolete' | 'archive';
  academic_year: string;
  generated_by: string | null;
  generated_by_name: string | null;
  metadata: Record<string, unknown> | null;
  related_enseignant_id: string | null;
  related_ue_id: string | null;
  related_level: string | null;
  created_at: string;
}

export interface DocumentFilters {
  type?: string;
  status?: string;
  academic_year?: string;
  month?: string;     // 'YYYY-MM' — filtre sur created_at
  search?: string;    // cherche dans title et file_name
}

// ============================================================
// Fonctions
// ============================================================

/**
 * Insère un enregistrement dans la table documents.
 */
export async function enregistrerDocument(data: SaveDocumentParams): Promise<string> {
  const { data: inserted, error } = await (supabase as any)
    .from('documents')
    .insert({ ...data, status: 'actif' })
    .select('id')
    .single();

  if (error) throw new Error(`enregistrerDocument: ${error.message}`);
  return inserted.id as string;
}

/**
 * Upload un fichier Blob/File dans le bucket 'documents'.
 * Chemin recommandé : [department_id]/[academic_year]/[type]/[filename]
 * Retourne le path public si le bucket est public, sinon le path uniquement.
 */
export async function uploadDocumentFile(
  file: Blob | File,
  path: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`uploadDocumentFile: ${error.message}`);
  return path;
}

/**
 * Marque un document comme obsolète.
 */
export async function marquerObsolete(document_id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('documents')
    .update({ status: 'obsolete' })
    .eq('id', document_id);

  if (error) throw new Error(`marquerObsolete: ${error.message}`);
}

/**
 * Récupère les documents d'un département avec filtres optionnels.
 * Tri par date décroissante.
 */
export async function getDocuments(
  department_id: string,
  filters: DocumentFilters = {},
): Promise<Document[]> {
  let query = (supabase as any)
    .from('documents')
    .select('*')
    .eq('department_id', department_id)
    .order('created_at', { ascending: false });

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.academic_year && filters.academic_year !== 'all') {
    query = query.eq('academic_year', filters.academic_year);
  }
  if (filters.month && filters.month !== 'all') {
    // Filtrer par mois : created_at BETWEEN YYYY-MM-01 AND YYYY-MM-31
    const [year, month] = filters.month.split('-');
    const from = `${year}-${month}-01`;
    const to   = `${year}-${month}-31`;
    query = query.gte('created_at', from).lte('created_at', to);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getDocuments: ${error.message}`);

  let docs = (data ?? []) as Document[];

  // Filtre côté client sur le texte libre (title ou file_name)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    docs = docs.filter(
      d =>
        d.title?.toLowerCase().includes(q) ||
        d.file_name?.toLowerCase().includes(q),
    );
  }

  return docs;
}

/**
 * Télécharge un fichier depuis le bucket 'documents' et déclenche le download navigateur.
 */
export async function downloadDocument(doc: Document): Promise<void> {
  if (!doc.file_path) throw new Error('Aucun fichier associé à ce document');

  const { data, error } = await supabase.storage
    .from('documents')
    .download(doc.file_path);

  if (error) throw new Error(`Erreur de téléchargement : ${error.message}`);

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.file_name;
  a.click();
  URL.revokeObjectURL(url);
}
