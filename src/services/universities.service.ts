import { supabase } from "@/integrations/supabase/client";
import Fuse from "fuse.js";

export interface University {
  id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  city: string | null;
  logo_url: string | null;
  logo_path: string | null;
  website: string | null;
  statut: "officielle" | "a_verifier";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Cache local pour éviter des appels répétés
let _cache: University[] | null = null;

async function fetchAll(): Promise<University[]> {
  if (_cache) return _cache;
  const { data, error } = await supabase
    .from("universities" as any)
    .select("*")
    .order("name");
  if (error) throw error;
  _cache = (data ?? []) as University[];
  return _cache;
}

function clearCache() {
  _cache = null;
}

// ── searchUniversities ────────────────────────────────────────
// Recherche floue côté client avec Fuse.js
export async function searchUniversities(query: string): Promise<University[]> {
  const all = await fetchAll();
  if (!query.trim()) return all;

  const fuse = new Fuse(all, {
    keys: ["name", "short_name"],
    threshold: 0.4,
    includeScore: true,
  });

  return fuse.search(query).map((r) => r.item);
}

// ── getAllUniversities ─────────────────────────────────────────
export async function getAllUniversities(): Promise<University[]> {
  return fetchAll();
}

// ── getUniversity ──────────────────────────────────────────────
export async function getUniversity(id: string): Promise<University> {
  const { data, error } = await supabase
    .from("universities" as any)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as University;
}

// ── createUniversity ───────────────────────────────────────────
export interface CreateUniversityParams {
  name: string;
  short_name?: string;
  city?: string;
  country?: string;
  website?: string;
  logo_file?: File;
  statut?: "officielle" | "a_verifier";
}

export async function createUniversity(
  params: CreateUniversityParams
): Promise<University> {
  const { logo_file, ...rest } = params;

  // INSERT d'abord pour obtenir l'UUID
  const { data: created, error: insertErr } = await supabase
    .from("universities" as any)
    .insert({
      name: rest.name,
      short_name: rest.short_name ?? null,
      city: rest.city ?? null,
      country: rest.country ?? "Sénégal",
      website: rest.website ?? null,
      statut: rest.statut ?? "a_verifier",
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  const university = created as University;

  // Upload logo si fourni
  if (logo_file) {
    const logoUrl = await uploadLogo(university.id, logo_file);
    clearCache();
    return { ...university, logo_url: logoUrl };
  }

  clearCache();
  return university;
}

// ── updateUniversity ───────────────────────────────────────────
export async function updateUniversity(
  id: string,
  data: Partial<Omit<University, "id" | "created_at" | "updated_at">>
): Promise<University> {
  const { data: updated, error } = await supabase
    .from("universities" as any)
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  clearCache();
  return updated as University;
}

// ── deleteUniversity ───────────────────────────────────────────
export async function deleteUniversity(id: string): Promise<void> {
  const { error } = await supabase
    .from("universities" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
  clearCache();
}

// ── countDepartments ───────────────────────────────────────────
export async function countDepartmentsForUniversity(id: string): Promise<number> {
  const { count, error } = await supabase
    .from("departments" as any)
    .select("*", { count: "exact", head: true })
    .eq("university_id", id);
  if (error) throw error;
  return count ?? 0;
}

// ── uploadLogo ─────────────────────────────────────────────────
export async function uploadLogo(
  university_id: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${university_id}/logo.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("university-logos")
    .upload(path, file, { upsert: true });

  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage
    .from("university-logos")
    .getPublicUrl(path);

  const logo_url = urlData.publicUrl;

  // Mettre à jour la table
  const { error: updateErr } = await supabase
    .from("universities" as any)
    .update({ logo_url, logo_path: path })
    .eq("id", university_id);

  if (updateErr) throw updateErr;

  clearCache();
  return logo_url;
}
