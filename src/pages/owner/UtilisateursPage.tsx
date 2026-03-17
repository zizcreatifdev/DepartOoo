/**
 * UtilisateursPage — Owner
 * Liste tous les utilisateurs de la plateforme (profiles + user_roles).
 * Données réelles Supabase.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Search, Shield, GraduationCap, UserCheck, UserX,
  CalendarDays, Mail, Building2, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────
interface Utilisateur {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_suspended: boolean;
  created_at: string;
  department_name: string | null;
  university_name: string | null;
}

// ── Service ──────────────────────────────────────────────────
async function fetchUtilisateurs(): Promise<Utilisateur[]> {
  const { data: profiles, error } = await (supabase as any)
    .from("profiles")
    .select(`
      id, full_name, email, is_suspended, created_at,
      user_roles (role),
      departments!departments_chef_id_fkey (name, university)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name ?? null,
    email: p.email ?? null,
    role: p.user_roles?.[0]?.role ?? null,
    is_suspended: p.is_suspended ?? false,
    created_at: p.created_at,
    department_name: p.departments?.name ?? null,
    university_name: p.departments?.university ?? null,
  }));
}

async function toggleSuspend(userId: string, suspend: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ is_suspended: suspend })
    .eq("id", userId);
  if (error) throw error;
}

// ── Helpers ──────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    owner:      { label: "Owner",       className: "bg-red-100 text-red-700 border-red-200" },
    chef:       { label: "Chef",        className: "bg-blue-100 text-blue-700 border-blue-200" },
    assistant:  { label: "Assistant",   className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    enseignant: { label: "Enseignant",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const cfg = map[role ?? ""] ?? { label: role ?? "—", className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────
const UtilisateursPage = () => {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("tous");
  const [confirmUser, setConfirmUser] = useState<Utilisateur | null>(null);
  const qc = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["owner-utilisateurs"],
    queryFn: fetchUtilisateurs,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      toggleSuspend(id, suspend),
    onSuccess: (_, { suspend }) => {
      toast.success(suspend ? "Compte suspendu." : "Compte réactivé.");
      qc.invalidateQueries({ queryKey: ["owner-utilisateurs"] });
      setConfirmUser(null);
    },
    onError: (err: any) => toast.error("Erreur : " + err.message),
  });

  const roles = ["tous", "chef", "assistant", "enseignant", "owner"];

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.department_name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchRole = filterRole === "tous" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const nbChefs       = users.filter((u) => u.role === "chef").length;
  const nbEnseignants = users.filter((u) => u.role === "enseignant").length;
  const nbSuspendus   = users.filter((u) => u.is_suspended).length;

  return (
    <DashboardLayout title="Utilisateurs">
      <div className="space-y-6">

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total utilisateurs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{nbChefs}</p>
                <p className="text-xs text-muted-foreground">Chefs de départ.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{nbEnseignants}</p>
                <p className="text-xs text-muted-foreground">Enseignants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <UserX className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{nbSuspendus}</p>
                <p className="text-xs text-muted-foreground">Suspendus</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Liste ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Tous les utilisateurs
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Nom, email, département..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {roles.map((r) => (
                  <Button
                    key={r}
                    variant={filterRole === r ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterRole(r)}
                    className="text-xs capitalize"
                  >
                    {r === "tous" ? "Tous" : r}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tableau */}
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {users.length === 0
                  ? "Aucun utilisateur enregistré."
                  : "Aucun résultat pour cette recherche."}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      u.is_suspended
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-card hover:bg-muted/30"
                    }`}
                  >
                    {/* Avatar initial */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {u.full_name ?? "Sans nom"}
                        </p>
                        <RoleBadge role={u.role} />
                        {u.is_suspended && (
                          <Badge variant="destructive" className="text-[10px]">
                            Suspendu
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {u.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {u.email}
                          </span>
                        )}
                        {u.department_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {u.department_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(u.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action suspend/réactiver (pas pour owner) */}
                    {u.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`shrink-0 text-xs ${
                          u.is_suspended
                            ? "text-emerald-600 hover:text-emerald-700"
                            : "text-destructive hover:text-destructive/80"
                        }`}
                        onClick={() => setConfirmUser(u)}
                      >
                        {u.is_suspended ? (
                          <><UserCheck className="h-3.5 w-3.5 mr-1" /> Réactiver</>
                        ) : (
                          <><UserX className="h-3.5 w-3.5 mr-1" /> Suspendre</>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="text-xs text-muted-foreground text-right pt-1">
                {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialog confirmation suspend ── */}
      <Dialog open={!!confirmUser} onOpenChange={() => setConfirmUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmUser?.is_suspended ? "Réactiver le compte" : "Suspendre le compte"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmUser?.is_suspended
              ? `Voulez-vous réactiver le compte de ${confirmUser.full_name ?? confirmUser.email} ?`
              : `Voulez-vous suspendre le compte de ${confirmUser?.full_name ?? confirmUser?.email} ? L'utilisateur ne pourra plus se connecter.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUser(null)}>Annuler</Button>
            <Button
              variant={confirmUser?.is_suspended ? "default" : "destructive"}
              disabled={mutation.isPending}
              onClick={() =>
                confirmUser &&
                mutation.mutate({ id: confirmUser.id, suspend: !confirmUser.is_suspended })
              }
            >
              {mutation.isPending
                ? "En cours..."
                : confirmUser?.is_suspended
                ? "Réactiver"
                : "Suspendre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UtilisateursPage;
