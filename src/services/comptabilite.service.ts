/**
 * comptabilite.service.ts
 * Gestion de la comptabilité owner :
 *  - Recettes : issues de la table paiements (statut = 'paye')
 *  - Dépenses : table depenses (owner uniquement)
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────

export interface Recette {
  id: string;
  department_id: string;
  department_name: string;
  university: string | null;
  montant: number;            // FCFA
  date_paiement: string;      // DATE ISO
  mode_paiement: string | null;
  note: string | null;
}

export interface Depense {
  id: string;
  categorie: DepenseCategorie;
  libelle: string;
  montant: number;            // FCFA
  date_depense: string;       // DATE ISO
  mode_paiement: string | null;
  note: string | null;
  created_at: string;
}

export type DepenseCategorie =
  | "hebergement"
  | "outils"
  | "marketing"
  | "salaires"
  | "communication"
  | "autres";

export interface DepenseCreate {
  categorie: DepenseCategorie;
  libelle: string;
  montant: number;
  date_depense: string;
  mode_paiement?: string | null;
  note?: string | null;
}

export interface ComptabiliteSummary {
  total_recettes: number;
  total_depenses: number;
  solde: number;
  nb_recettes: number;
  nb_depenses: number;
}

// Libellés FR pour les catégories
export const CATEGORIE_LABELS: Record<DepenseCategorie, string> = {
  hebergement:   "Hébergement / Serveurs",
  outils:        "Outils & Logiciels",
  marketing:     "Marketing & Communication",
  salaires:      "Salaires & Freelances",
  communication: "Télécom & Internet",
  autres:        "Autres",
};

// ── Recettes (depuis paiements payés) ─────────────────────

export async function getRecettes(
  moisDebut?: string,
  moisFin?: string,
): Promise<Recette[]> {
  let query = (supabase as any)
    .from("paiements")
    .select(`
      id, department_id, montant, date_paiement, mode_paiement, note,
      departments!paiements_department_id_fkey (name, university)
    `)
    .eq("statut", "paye")
    .not("date_paiement", "is", null)
    .order("date_paiement", { ascending: false });

  if (moisDebut) query = query.gte("date_paiement", moisDebut);
  if (moisFin)   query = query.lte("date_paiement", moisFin);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id:              p.id,
    department_id:   p.department_id,
    department_name: p.departments?.name ?? "—",
    university:      p.departments?.university ?? null,
    montant:         p.montant,
    date_paiement:   p.date_paiement,
    mode_paiement:   p.mode_paiement,
    note:            p.note,
  }));
}

// ── Dépenses ──────────────────────────────────────────────

export async function getDepenses(
  moisDebut?: string,
  moisFin?: string,
): Promise<Depense[]> {
  let query = (supabase as any)
    .from("depenses")
    .select("*")
    .order("date_depense", { ascending: false });

  if (moisDebut) query = query.gte("date_depense", moisDebut);
  if (moisFin)   query = query.lte("date_depense", moisFin);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createDepense(payload: DepenseCreate): Promise<Depense> {
  const { data, error } = await (supabase as any)
    .from("depenses")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateDepense(
  id: string,
  payload: Partial<DepenseCreate>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("depenses")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDepense(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("depenses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Résumé combiné ────────────────────────────────────────

export async function getComptabiliteSummary(
  moisDebut?: string,
  moisFin?: string,
): Promise<ComptabiliteSummary> {
  const [recettes, depenses] = await Promise.all([
    getRecettes(moisDebut, moisFin),
    getDepenses(moisDebut, moisFin),
  ]);

  const total_recettes = recettes.reduce((s, r) => s + r.montant, 0);
  const total_depenses = depenses.reduce((s, d) => s + d.montant, 0);

  return {
    total_recettes,
    total_depenses,
    solde: total_recettes - total_depenses,
    nb_recettes: recettes.length,
    nb_depenses: depenses.length,
  };
}

// ── Utilitaire : formater FCFA ─────────────────────────────

export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
}
