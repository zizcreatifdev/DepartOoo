/**
 * DepartementsPage — Owner
 * Liste tous les départements enregistrés sur la plateforme.
 * Données réelles Supabase (table departments + profiles).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Building2, Search, GraduationCap, Users, CheckCircle2,
  Clock, ChevronRight, CalendarDays, UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreateChefDialog from "@/components/owner/CreateChefDialog";

// ── Types ────────────────────────────────────────────────────
interface Departement {
  id: string;
  name: string;
  university: string | null;
  university_id: string | null;
  onboarding_completed: boolean;
  offre: string | null;
  created_at: string;
  chef_name: string | null;
  chef_email: string | null;
  nb_enseignants: number;
  nb_filieres: number;
}

// ── Service ──────────────────────────────────────────────────
async function fetchDepartements(): Promise<Departement[]> {
  const { data: depts, error } = await (supabase as any)
    .from("departments")
    .select(`
      id, name, university, university_id, onboarding_completed, offre, created_at,
      profiles!departments_chef_id_fkey (full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Compter enseignants et filières en parallèle
  const enriched = await Promise.all(
    (depts ?? []).map(async (d: any) => {
      const [{ count: nb_enseignants }, { count: nb_filieres }] = await Promise.all([
        supabase.from("enseignants").select("*", { count: "exact", head: true }).eq("department_id", d.id),
        (supabase as any).from("filieres").select("*", { count: "exact", head: true }).eq("department_id", d.id),
      ]);
      return {
        id: d.id,
        name: d.name,
        university: d.university ?? null,
        university_id: d.university_id ?? null,
        onboarding_completed: d.onboarding_completed ?? false,
        offre: d.offre ?? null,
        created_at: d.created_at,
        chef_name: d.profiles?.full_name ?? null,
        chef_email: d.profiles?.email ?? null,
        nb_enseignants: nb_enseignants ?? 0,
        nb_filieres: nb_filieres ?? 0,
      };
    })
  );
  return enriched;
}

// ── Helpers ──────────────────────────────────────────────────
function OffreBadge({ offre }: { offre: string | null }) {
  const map: Record<string, string> = {
    starter: "bg-slate-100 text-slate-700 border-slate-200",
    pro: "bg-blue-100 text-blue-700 border-blue-200",
    universite: "bg-violet-100 text-violet-700 border-violet-200",
  };
  const label = offre ? offre.charAt(0).toUpperCase() + offre.slice(1) : "—";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[offre ?? ""] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card className={`border-${color}/20 bg-${color}/5`}>
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        <div className={`text-${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────
const DepartementsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"tous" | "actifs" | "en_cours">("tous");

  // Créer chef
  const [createChefDept, setCreateChefDept] = useState<{ id: string; name: string } | null>(null);

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ["owner-departements"],
    queryFn: fetchDepartements,
    staleTime: 60_000,
  });

  const filtered = depts.filter((d) => {
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.university ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.chef_name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "tous" ||
      (filter === "actifs" && d.onboarding_completed) ||
      (filter === "en_cours" && !d.onboarding_completed);

    return matchSearch && matchFilter;
  });

  const nbActifs = depts.filter((d) => d.onboarding_completed).length;
  const nbEnCours = depts.filter((d) => !d.onboarding_completed).length;

  return (
    <DashboardLayout title="Départements">
      <div className="space-y-6">

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{depts.length}</p>
                <p className="text-xs text-muted-foreground">Total départements</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{nbActifs}</p>
                <p className="text-xs text-muted-foreground">Onboarding complété</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{nbEnCours}</p>
                <p className="text-xs text-muted-foreground">En cours d'onboarding</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Filtres + recherche ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Liste des départements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher par nom, université, chef..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                {(["tous", "actifs", "en_cours"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="text-xs"
                  >
                    {f === "tous" ? "Tous" : f === "actifs" ? "✓ Actifs" : "⏳ En cours"}
                  </Button>
                ))}
              </div>
            </div>

            {/* ── Liste ── */}
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {depts.length === 0
                  ? "Aucun département enregistré pour l'instant."
                  : "Aucun résultat pour cette recherche."}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <OffreBadge offre={d.offre} />
                        {d.onboarding_completed ? (
                          <span className="text-[10px] text-emerald-600 font-medium">● Actif</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">● En cours</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {d.university && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" /> {d.university}
                          </span>
                        )}
                        {d.chef_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {d.chef_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {d.nb_enseignants} enseignant{d.nb_enseignants !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!d.chef_name && d.onboarding_completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => setCreateChefDept({ id: d.id, name: d.name })}
                        >
                          <UserPlus className="h-3 w-3" />
                          Créer chef
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="text-xs text-muted-foreground text-right pt-1">
                {filtered.length} département{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog création chef */}
      {createChefDept && (
        <CreateChefDialog
          open={!!createChefDept}
          onOpenChange={(v) => { if (!v) setCreateChefDept(null); }}
          departmentId={createChefDept.id}
          departmentName={createChefDept.name}
          onCreated={() => {
            setCreateChefDept(null);
            qc.invalidateQueries({ queryKey: ["owner-departements"] });
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default DepartementsPage;
