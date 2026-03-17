/**
 * licences.service.ts
 * Gestion des licences (dates sur departments) et des paiements.
 * Accès owner uniquement.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────

export interface LicenceDept {
  id: string;
  name: string;
  university: string | null;
  offre: string;
  licence_debut: string | null;   // DATE ISO
  licence_expire: string | null;  // DATE ISO
  licence_note: string | null;
  jours_restants: number | null;  // calculé côté client
}

export interface Paiement {
  id: string;
  department_id: string;
  department_name: string;
  university: string | null;
  montant: number;
  date_echeance: string;    // DATE ISO
  date_paiement: string | null;
  statut: "en_attente" | "paye" | "en_retard" | "annule";
  mode_paiement: string | null;
  note: string | null;
  created_at: string;
}

export interface PaiementCreate {
  department_id: string;
  montant: number;
  date_echeance: string;
  date_paiement?: string | null;
  statut: "en_attente" | "paye" | "en_retard" | "annule";
  mode_paiement?: string | null;
  note?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

function joursRestants(expire: string | null): number | null {
  if (!expire) return null;
  const diff = new Date(expire).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Licences ─────────────────────────────────────────────────

export async function getLicences(): Promise<LicenceDept[]> {
  const { data, error } = await (supabase as any)
    .from("departments")
    .select("id, name, university, offre, licence_debut, licence_expire, licence_note")
    .eq("onboarding_completed", true)
    .order("licence_expire", { ascending: true, nullsFirst: false });
  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    ...d,
    jours_restants: joursRestants(d.licence_expire),
  }));
}

export async function updateLicence(
  deptId: string,
  data: { offre?: string; licence_debut?: string | null; licence_expire?: string | null; licence_note?: string | null }
): Promise<void> {
  const { error } = await (supabase as any)
    .from("departments")
    .update(data)
    .eq("id", deptId);
  if (error) throw error;
}

// ── Licences expirant bientôt (≤ 60 jours) ──────────────────

export async function getLicencesExpirantBientot(jours = 60): Promise<LicenceDept[]> {
  const today = new Date().toISOString().split("T")[0];
  const limite = new Date(Date.now() + jours * 86400_000).toISOString().split("T")[0];

  const { data, error } = await (supabase as any)
    .from("departments")
    .select("id, name, university, offre, licence_debut, licence_expire, licence_note")
    .eq("onboarding_completed", true)
    .gte("licence_expire", today)
    .lte("licence_expire", limite)
    .order("licence_expire", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    ...d,
    jours_restants: joursRestants(d.licence_expire),
  }));
}

// ── Paiements ────────────────────────────────────────────────

export async function getPaiements(): Promise<Paiement[]> {
  const { data, error } = await (supabase as any)
    .from("paiements")
    .select(`
      id, department_id, montant, date_echeance, date_paiement,
      statut, mode_paiement, note, created_at,
      departments!paiements_department_id_fkey (name, university)
    `)
    .order("date_echeance", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    ...p,
    department_name: p.departments?.name ?? "—",
    university: p.departments?.university ?? null,
  }));
}

export async function getPaiementsEnRetard(): Promise<Paiement[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await (supabase as any)
    .from("paiements")
    .select(`
      id, department_id, montant, date_echeance, date_paiement,
      statut, mode_paiement, note, created_at,
      departments!paiements_department_id_fkey (name, university)
    `)
    .in("statut", ["en_attente", "en_retard"])
    .lt("date_echeance", today)
    .order("date_echeance", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    ...p,
    department_name: p.departments?.name ?? "—",
    university: p.departments?.university ?? null,
  }));
}

export async function createPaiement(data: PaiementCreate): Promise<Paiement> {
  const { data: row, error } = await (supabase as any)
    .from("paiements")
    .insert(data)
    .select(`
      id, department_id, montant, date_echeance, date_paiement,
      statut, mode_paiement, note, created_at,
      departments!paiements_department_id_fkey (name, university)
    `)
    .single();
  if (error) throw error;
  return { ...row, department_name: row.departments?.name ?? "—", university: row.departments?.university ?? null };
}

export async function updatePaiement(
  id: string,
  data: Partial<PaiementCreate>
): Promise<void> {
  const { error } = await (supabase as any)
    .from("paiements")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function marquerPaye(id: string, date_paiement?: string): Promise<void> {
  await updatePaiement(id, {
    statut: "paye",
    date_paiement: date_paiement ?? new Date().toISOString().split("T")[0],
  });
}

export async function deletePaiement(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("paiements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
