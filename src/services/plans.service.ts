/**
 * plans.service.ts
 * Gestion des plans tarifaires (table `plans`).
 * Lecture publique (landing page) — écriture owner uniquement.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_label: string;
  period_label: string | null;
  description: string | null;
  features: string[];
  note: string | null;
  cta_label: string;
  badge: string | null;
  action: "login" | "contact";
  is_active: boolean;
  is_highlighted: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanUpsert {
  name: string;
  slug: string;
  price_label: string;
  period_label?: string | null;
  description?: string | null;
  features: string[];
  note?: string | null;
  cta_label: string;
  badge?: string | null;
  action: "login" | "contact";
  is_active: boolean;
  is_highlighted: boolean;
  display_order: number;
}

// ── Lecture publique ─────────────────────────────────────────

/** Récupère tous les plans actifs triés par display_order */
export async function getActivePlans(): Promise<Plan[]> {
  const { data, error } = await (supabase as any)
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizePlan);
}

/** Récupère tous les plans (y compris inactifs) — pour l'owner */
export async function getAllPlans(): Promise<Plan[]> {
  const { data, error } = await (supabase as any)
    .from("plans")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizePlan);
}

// ── Écriture owner ───────────────────────────────────────────

export async function createPlan(payload: PlanUpsert): Promise<Plan> {
  const { data, error } = await (supabase as any)
    .from("plans")
    .insert({ ...payload, features: JSON.stringify(payload.features) })
    .select()
    .single();
  if (error) throw error;
  return normalizePlan(data);
}

export async function updatePlan(id: string, payload: Partial<PlanUpsert>): Promise<Plan> {
  const body: any = { ...payload };
  if (payload.features) body.features = JSON.stringify(payload.features);
  const { data, error } = await (supabase as any)
    .from("plans")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return normalizePlan(data);
}

export async function togglePlanActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from("plans")
    .update({ is_active })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("plans")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Helper ───────────────────────────────────────────────────
function normalizePlan(raw: any): Plan {
  let features: string[] = [];
  if (Array.isArray(raw.features)) {
    features = raw.features;
  } else if (typeof raw.features === "string") {
    try { features = JSON.parse(raw.features); } catch { features = []; }
  }
  return { ...raw, features };
}
