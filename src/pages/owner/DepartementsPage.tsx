/**
 * DepartementsPage — Owner
 * Liste tous les départements enregistrés sur la plateforme.
 * Données réelles Supabase (table departments + profiles).
 * Actions : créer chef, bloquer, restaurer, supprimer.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2, Search, GraduationCap, Users, CheckCircle2,
  Clock, CalendarDays, UserPlus, Plus, MoreVertical,
  Ban, RotateCcw, Trash2, ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllUniversities, University } from "@/services/universities.service";
import CreateChefDialog from "@/components/owner/CreateChefDialog";

// ── Types ────────────────────────────────────────────────────
interface Departement {
  id: string;
  name: string;
  university: string | null;
  university_id: string | null;
  ufr: string | null;
  onboarding_completed: boolean;
  offre: string | null;
  status: "active" | "blocked";
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
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!depts || depts.length === 0) return [];

  const chefIds = depts.map((d: any) => d.chef_id).filter(Boolean);
  const profilesMap: Record<string, { full_name: string; email: string }> = {};
  if (chefIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, email")
      .in("id", chefIds);
    (profiles ?? []).forEach((p: any) => {
      profilesMap[p.id] = { full_name: p.full_name, email: p.email };
    });
  }

  const enriched = await Promise.all(
    depts.map(async (d: any) => {
      const [{ count: nb_enseignants }, { count: nb_filieres }] = await Promise.all([
        supabase.from("enseignants").select("*", { count: "exact", head: true }).eq("department_id", d.id),
        (supabase as any).from("filieres").select("*", { count: "exact", head: true }).eq("department_id", d.id),
      ]);
      const chef = d.chef_id ? profilesMap[d.chef_id] : null;
      return {
        id: d.id,
        name: d.name,
        university: d.university ?? null,
        university_id: d.university_id ?? null,
        ufr: d.ufr ?? null,
        onboarding_completed: d.onboarding_completed ?? false,
        offre: d.offre ?? null,
        status: (d.status ?? "active") as "active" | "blocked",
        created_at: d.created_at,
        chef_name: chef?.full_name ?? null,
        chef_email: chef?.email ?? null,
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
    starter:    "bg-slate-100 text-slate-700 border-slate-200",
    pro:        "bg-blue-100 text-blue-700 border-blue-200",
    universite: "bg-violet-100 text-violet-700 border-violet-200",
  };
  const label = offre ? offre.charAt(0).toUpperCase() + offre.slice(1) : "—";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[offre ?? ""] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

// ── Dialog Nouveau département ────────────────────────────────
interface NouveauDeptDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

function NouveauDeptDialog({ open, onOpenChange, onCreated }: NouveauDeptDialogProps) {
  const [univId,   setUnivId]   = useState("");
  const [ufr,      setUfr]      = useState("");
  const [deptName, setDeptName] = useState("");
  const [offre,    setOffre]    = useState<"starter" | "pro" | "universite">("starter");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const { data: universities = [] } = useQuery<University[]>({
    queryKey: ["universities-list"],
    queryFn: getAllUniversities,
    staleTime: 5 * 60_000,
  });

  function reset() {
    setUnivId(""); setUfr(""); setDeptName(""); setOffre("starter"); setError(null);
  }
  function close() { onOpenChange(false); reset(); }

  async function handleCreate() {
    setError(null);
    if (!univId)          return setError("Veuillez sélectionner une université.");
    if (!deptName.trim()) return setError("Le nom du département est requis.");

    const univ = universities.find((u) => u.id === univId);
    setSaving(true);
    try {
      const { error: err } = await (supabase as any)
        .from("departments")
        .insert({
          name:                 deptName.trim(),
          university_id:        univId,
          university:           univ?.name ?? "",
          ufr:                  ufr.trim() || null,
          offre,
          onboarding_completed: false,
          status:               "active",
        });
      if (err) throw err;

      toast.success(`Département "${deptName.trim()}" créé ✅`);
      onCreated();
      close();
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Nouveau département
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Université *</Label>
            <Select value={univId} onValueChange={setUnivId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une université…" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.short_name ? `${u.name} (${u.short_name})` : u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">UFR (Unité de Formation et de Recherche)</Label>
            <Input
              placeholder="ex: UFR Sciences et Technologies…"
              value={ufr}
              onChange={(e) => setUfr(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Optionnel — niveau intermédiaire entre l'université et le département</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nom du département *</Label>
            <Input
              placeholder="ex: Département Informatique…"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Offre souscrite *</Label>
            <Select value={offre} onValueChange={(v: any) => setOffre(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="universite">Université</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>Annuler</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Création…" : "Créer le département"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────
type ActionType = "block" | "restore" | "delete";

const DepartementsPage = () => {
  const qc = useQueryClient();
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState<"tous" | "actifs" | "en_cours" | "bloques">("tous");
  const [newDeptOpen, setNewDeptOpen] = useState(false);

  // Créer chef
  const [createChefDept, setCreateChefDept] = useState<{ id: string; name: string } | null>(null);

  // Action (bloquer / restaurer / supprimer)
  const [actionDept,    setActionDept]    = useState<Departement | null>(null);
  const [actionType,    setActionType]    = useState<ActionType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      filter === "tous"     ||
      (filter === "actifs"   && d.onboarding_completed && d.status === "active") ||
      (filter === "en_cours" && !d.onboarding_completed && d.status === "active") ||
      (filter === "bloques"  && d.status === "blocked");

    return matchSearch && matchFilter;
  });

  const nbActifs  = depts.filter((d) =>  d.onboarding_completed && d.status === "active").length;
  const nbEnCours = depts.filter((d) => !d.onboarding_completed && d.status === "active").length;
  const nbBloques = depts.filter((d) =>  d.status === "blocked").length;

  function refreshDepts() {
    qc.invalidateQueries({ queryKey: ["owner-departements"] });
  }

  function openAction(dept: Departement, type: ActionType) {
    setActionDept(dept);
    setActionType(type);
  }

  async function confirmAction() {
    if (!actionDept || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "delete") {
        const { error } = await (supabase as any)
          .from("departments")
          .delete()
          .eq("id", actionDept.id);
        if (error) throw error;
        toast.success(`Département "${actionDept.name}" supprimé`);
      } else {
        const newStatus = actionType === "block" ? "blocked" : "active";
        const { error } = await (supabase as any)
          .from("departments")
          .update({ status: newStatus })
          .eq("id", actionDept.id);
        if (error) throw error;
        toast.success(
          actionType === "block"
            ? `Département "${actionDept.name}" bloqué`
            : `Département "${actionDept.name}" restauré`
        );
      }
      refreshDepts();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'action.");
    } finally {
      setActionLoading(false);
      setActionDept(null);
      setActionType(null);
    }
  }

  // Textes de la modale de confirmation
  const actionMeta: Record<ActionType, { title: string; desc: (name: string) => string; btn: string; variant: "destructive" | "default" }> = {
    block: {
      title: "Bloquer le département",
      desc: (n) => `Le département "${n}" sera suspendu. Le chef et les enseignants ne pourront plus se connecter. Vous pourrez le restaurer à tout moment.`,
      btn: "Bloquer",
      variant: "destructive",
    },
    restore: {
      title: "Restaurer le département",
      desc: (n) => `Le département "${n}" sera de nouveau actif. Le chef et les enseignants retrouveront accès à leur espace.`,
      btn: "Restaurer",
      variant: "default",
    },
    delete: {
      title: "Supprimer le département",
      desc: (n) => `Cette action est irréversible. Le département "${n}" et toutes ses données (filières, enseignants…) seront définitivement supprimés.`,
      btn: "Supprimer définitivement",
      variant: "destructive",
    },
  };

  return (
    <DashboardLayout title="Départements">
      <div className="space-y-6">

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-4">
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
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <ShieldOff className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{nbBloques}</p>
                <p className="text-xs text-muted-foreground">Bloqués</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Liste ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Liste des départements
              </CardTitle>
              <Button size="sm" className="gap-1.5" onClick={() => setNewDeptOpen(true)}>
                <Plus className="h-4 w-4" /> Nouveau département
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filtres + recherche */}
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
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: "tous",     label: "Tous" },
                  { key: "actifs",   label: "✓ Actifs" },
                  { key: "en_cours", label: "⏳ En cours" },
                  { key: "bloques",  label: "🚫 Bloqués" },
                ] as const).map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={filter === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(key)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Résultats */}
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {depts.length === 0 ? (
                  <div className="space-y-2">
                    <p>Aucun département enregistré pour l'instant.</p>
                    <Button variant="outline" size="sm" onClick={() => setNewDeptOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Créer le premier département
                    </Button>
                  </div>
                ) : (
                  "Aucun résultat pour cette recherche."
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors ${
                      d.status === "blocked"
                        ? "opacity-60 bg-red-50/50 border-red-200"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      d.status === "blocked" ? "bg-red-100" : "bg-primary/10"
                    }`}>
                      {d.status === "blocked"
                        ? <Ban className="h-4 w-4 text-red-500" />
                        : <Building2 className="h-4 w-4 text-primary" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <OffreBadge offre={d.offre} />
                        {d.status === "blocked" ? (
                          <span className="text-[10px] text-red-600 font-medium">● Bloqué</span>
                        ) : d.onboarding_completed ? (
                          <span className="text-[10px] text-emerald-600 font-medium">● Actif</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">● En cours</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {d.university && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {d.university}
                            {d.ufr && <span className="text-muted-foreground/60">› {d.ufr}</span>}
                          </span>
                        )}
                        {d.chef_name ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {d.chef_name}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <Users className="h-3 w-3" /> Pas de chef
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

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!d.chef_name && d.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => setCreateChefDept({ id: d.id, name: d.name })}
                        >
                          <UserPlus className="h-3 w-3" /> Créer chef
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {d.status === "active" ? (
                            <DropdownMenuItem
                              className="text-amber-600 focus:text-amber-600 gap-2"
                              onClick={() => openAction(d, "block")}
                            >
                              <Ban className="h-4 w-4" /> Bloquer
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-emerald-600 focus:text-emerald-600 gap-2"
                              onClick={() => openAction(d, "restore")}
                            >
                              <RotateCcw className="h-4 w-4" /> Restaurer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive gap-2"
                            onClick={() => openAction(d, "delete")}
                          >
                            <Trash2 className="h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Dialog nouveau département */}
      <NouveauDeptDialog
        open={newDeptOpen}
        onOpenChange={setNewDeptOpen}
        onCreated={refreshDepts}
      />

      {/* Dialog création chef */}
      {createChefDept && (
        <CreateChefDialog
          open={!!createChefDept}
          onOpenChange={(v) => { if (!v) setCreateChefDept(null); }}
          departmentId={createChefDept.id}
          departmentName={createChefDept.name}
          onCreated={() => { setCreateChefDept(null); refreshDepts(); }}
        />
      )}

      {/* AlertDialog confirmation action */}
      <AlertDialog
        open={!!actionDept && !!actionType}
        onOpenChange={(v) => { if (!v) { setActionDept(null); setActionType(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType ? actionMeta[actionType].title : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDept && actionType ? actionMeta[actionType].desc(actionDept.name) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={confirmAction}
              className={actionType === "restore" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {actionLoading ? "En cours…" : (actionType ? actionMeta[actionType].btn : "")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DepartementsPage;
