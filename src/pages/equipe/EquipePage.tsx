import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, UserPlus, MoreHorizontal, Mail,
  ShieldOff, ShieldCheck, UserMinus, KeyRound,
  ExternalLink, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getLimitesOffre, inviterAssistant } from "@/services/invitations.service";

// ============================================================
// Types
// ============================================================

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: "assistant" | "enseignant";
  is_suspended: boolean;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
}

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join("");
}

function StatutBadge({ member }: { member: TeamMember }) {
  if (member.is_suspended) {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 text-[10px]">
        Suspendu
      </Badge>
    );
  }
  if (!member.email_confirmed) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">
        Invitation en attente
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px]">
      Actif
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  return role === "assistant"
    ? <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px]">Assistant</Badge>
    : <Badge variant="secondary" className="text-[10px]">Enseignant</Badge>;
}

// ============================================================
// Page
// ============================================================

const EquipePage = () => {
  const { department, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Dialogs état ──────────────────────────────────────────
  const [inviteOpen, setInviteOpen]       = useState(false);
  const [inviteName, setInviteName]       = useState("");
  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviting, setInviting]           = useState(false);

  const [limiteDialog, setLimiteDialog]   = useState<string | null>(null); // message d'erreur limite
  const [confirmDialog, setConfirmDialog] = useState<{
    member: TeamMember;
    action: "suspend" | "reactivate" | "remove";
  } | null>(null);
  const [confirmName, setConfirmName]     = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [resetConfirm, setResetConfirm]   = useState<TeamMember | null>(null);

  // ── Fetch limites ─────────────────────────────────────────
  const { data: limites, isLoading: loadingLimites } = useQuery({
    queryKey: ["limites-offre", department?.id],
    queryFn: () => getLimitesOffre(department!.id),
    enabled: !!department,
    staleTime: 60_000,
  });

  // ── Fetch membres ─────────────────────────────────────────
  const { data: membersData, isLoading: loadingMembers, refetch } = useQuery({
    queryKey: ["team-members", department?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-team-members");
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return (data?.members ?? []) as TeamMember[];
    },
    enabled: !!department,
    staleTime: 30_000,
  });

  const members = membersData ?? [];

  // ── Action admin (suspend / reactivate / remove) ──────────
  const executeAction = async () => {
    if (!confirmDialog) return;
    const { member, action } = confirmDialog;

    // Pour "remove", l'utilisateur doit taper le nom
    if (action === "remove" && confirmName.trim().toLowerCase() !== member.full_name.toLowerCase()) {
      toast.error("Le nom saisi ne correspond pas.");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suspend-user", {
        body: { user_id: member.id, action },
      });

      if (error || data?.error) {
        toast.error(data?.error ?? error?.message ?? "Erreur serveur");
        return;
      }

      const labels: Record<string, string> = {
        suspend:    `${member.full_name} a été suspendu.`,
        reactivate: `${member.full_name} a été réactivé.`,
        remove:     `${member.full_name} n'a plus accès au département.`,
      };
      toast.success(labels[action]);
      setConfirmDialog(null);
      setConfirmName("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["limites-offre"] });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Réinitialiser le mot de passe ─────────────────────────
  const handleResetPassword = async (member: TeamMember) => {
    setResetConfirm(null);
    const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error) {
      toast.error("Erreur lors de l'envoi : " + error.message);
      return;
    }
    toast.success(`Email de réinitialisation envoyé à ${member.email}`);
  };

  // ── Renvoyer l'invitation ─────────────────────────────────
  const handleResendInvite = async (member: TeamMember) => {
    const { data, error } = await supabase.functions.invoke(
      member.role === "assistant" ? "invite-assistant" : "invite-teacher",
      {
        body: {
          email: member.email,
          full_name: member.full_name,
          department_id: department!.id,
        },
      },
    );
    if (error || data?.error) {
      const msg = data?.message ?? data?.error ?? error?.message ?? "Erreur";
      if (data?.error === "LIMITE_ATTEINTE") { setLimiteDialog(msg); return; }
      toast.error(msg);
      return;
    }
    toast.success(`Invitation renvoyée à ${member.email}`);
  };

  // ── Inviter un assistant ──────────────────────────────────
  const handleInviteAssistant = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Veuillez remplir le nom et l'email.");
      return;
    }
    setInviting(true);
    try {
      const result = await inviterAssistant(inviteEmail.trim(), inviteName.trim(), department!.id);
      if (!result.success) {
        if (result.error === "LIMITE_ATTEINTE") {
          setInviteOpen(false);
          setLimiteDialog(result.message ?? "Limite atteinte.");
        } else {
          toast.error(result.message ?? result.error ?? "Erreur lors de l'invitation");
        }
        return;
      }
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["limites-offre"] });
    } finally {
      setInviting(false);
    }
  };

  // ── Jauge offre ───────────────────────────────────────────
  const offreBadgeClass =
    limites?.offre === "universite" ? "bg-purple-100 text-purple-700 border-purple-200"
    : limites?.offre === "pro"      ? "bg-blue-100 text-blue-700 border-blue-200"
    :                                 "bg-slate-100 text-slate-700 border-slate-200";

  const assistantPct  = limites ? Math.min((limites.nb_assistants  / (limites.max_assistants  || 1)) * 100, 100) : 0;
  const enseignantPct = limites ? Math.min((limites.nb_enseignants / (limites.max_enseignants || 1)) * 100, 100) : 0;
  const showUpsell    = limites && (assistantPct >= 80 || enseignantPct >= 80);

  const canInviteAssistant = limites
    ? limites.nb_assistants < limites.max_assistants
    : true;

  // ============================================================
  return (
    <DashboardLayout title="Équipe">
      <div className="space-y-6">

        {/* ── SECTION 1 : Jauge offre ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Utilisation de l'offre</CardTitle>
              {loadingLimites
                ? <Skeleton className="h-5 w-20" />
                : (
                  <Badge className={`text-[10px] border ${offreBadgeClass}`}>
                    {limites?.offre?.toUpperCase()}
                  </Badge>
                )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingLimites ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : limites && (
              <>
                {/* Assistants */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Assistants</span>
                    <span className="font-medium tabular-nums">
                      {limites.nb_assistants} / {limites.max_assistants === Infinity ? "∞" : limites.max_assistants}
                    </span>
                  </div>
                  {limites.max_assistants !== Infinity && (
                    <Progress value={assistantPct} className={`h-2 ${assistantPct >= 80 ? "[&>div]:bg-amber-500" : ""}`} />
                  )}
                </div>

                {/* Enseignants */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enseignants</span>
                    <span className="font-medium tabular-nums">
                      {limites.nb_enseignants} / {limites.max_enseignants === Infinity ? "∞" : limites.max_enseignants}
                    </span>
                  </div>
                  {limites.max_enseignants !== Infinity && (
                    <Progress value={enseignantPct} className={`h-2 ${enseignantPct >= 80 ? "[&>div]:bg-amber-500" : ""}`} />
                  )}
                </div>

                {showUpsell && (
                  <div className="flex items-center gap-2 pt-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs text-amber-700">Vous approchez de la limite de votre offre.</span>
                    {limites.offre === "starter" ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" asChild>
                        <a href="mailto:contact@departo.app?subject=Upgrade Pro">Passer à Pro →</a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" asChild>
                        <a href="mailto:contact@departo.app?subject=Augmentation limite">Nous contacter →</a>
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── SECTION 2 : Tableau membres ── */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Membres du département
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/dashboard/${role}/enseignants`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Inviter un enseignant
            </Button>
            <Button
              size="sm"
              onClick={() => setInviteOpen(true)}
              disabled={!canInviteAssistant}
              title={!canInviteAssistant ? "Limite assistants atteinte" : undefined}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Inviter un assistant
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loadingMembers ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucun membre dans votre équipe</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Invitez un assistant ou ajoutez des enseignants pour commencer.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id} className={member.is_suspended ? "opacity-60" : ""}>
                      {/* Membre */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {getInitials(member.full_name) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Rôle */}
                      <TableCell><RoleBadge role={member.role} /></TableCell>

                      {/* Statut */}
                      <TableCell><StatutBadge member={member} /></TableCell>

                      {/* Dernière connexion */}
                      <TableCell className="text-xs text-muted-foreground">
                        {member.last_sign_in_at
                          ? formatDistanceToNow(new Date(member.last_sign_in_at), { addSuffix: true, locale: fr })
                          : "—"
                        }
                      </TableCell>

                      {/* Menu actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">

                            {/* Renvoyer l'invitation */}
                            {!member.email_confirmed && !member.is_suspended && (
                              <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                                <Mail className="h-3.5 w-3.5 mr-2" />
                                Renvoyer l'invitation
                              </DropdownMenuItem>
                            )}

                            {/* Réinitialiser le mot de passe */}
                            {member.email_confirmed && !member.is_suspended && (
                              <DropdownMenuItem onClick={() => setResetConfirm(member)}>
                                <KeyRound className="h-3.5 w-3.5 mr-2" />
                                Réinitialiser le mot de passe
                              </DropdownMenuItem>
                            )}

                            {/* Suspendre */}
                            {!member.is_suspended && (
                              <DropdownMenuItem
                                className="text-amber-600 focus:text-amber-600"
                                onClick={() => setConfirmDialog({ member, action: "suspend" })}
                              >
                                <ShieldOff className="h-3.5 w-3.5 mr-2" />
                                Suspendre l'accès
                              </DropdownMenuItem>
                            )}

                            {/* Réactiver */}
                            {member.is_suspended && (
                              <DropdownMenuItem
                                className="text-emerald-600 focus:text-emerald-600"
                                onClick={() => setConfirmDialog({ member, action: "reactivate" })}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                                Réactiver l'accès
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Retirer définitivement */}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setConfirmDialog({ member, action: "remove" }); setConfirmName(""); }}
                            >
                              <UserMinus className="h-3.5 w-3.5 mr-2" />
                              Retirer l'accès définitivement
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          Dialog : Inviter un assistant
      ============================================================ */}
      <Dialog open={inviteOpen} onOpenChange={o => { if (!o) setInviteOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Inviter un assistant</DialogTitle>
            <DialogDescription>
              Un email d'invitation sera envoyé pour créer le compte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input
                placeholder="Nom Prénom"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="assistant@universite.dz"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleInviteAssistant(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
              <Button disabled={inviting} onClick={handleInviteAssistant}>
                {inviting ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Envoi…</> : "Envoyer l'invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          Dialog : Limite atteinte
      ============================================================ */}
      <Dialog open={!!limiteDialog} onOpenChange={o => { if (!o) setLimiteDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Limite atteinte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{limiteDialog}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLimiteDialog(null)}>Fermer</Button>
              <Button asChild>
                <a href="mailto:contact@departo.app?subject=Upgrade offre">
                  {limites?.offre === "starter" ? "Passer à Pro →" : "Nous contacter →"}
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          Dialog : Confirmation suspend / reactivate / remove
      ============================================================ */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={o => { if (!o) { setConfirmDialog(null); setConfirmName(""); } }}
      >
        <DialogContent className="sm:max-w-md">
          {confirmDialog && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirmDialog.action === "suspend"    && "Suspendre l'accès"}
                  {confirmDialog.action === "reactivate" && "Réactiver l'accès"}
                  {confirmDialog.action === "remove"     && "Retirer l'accès définitivement"}
                </DialogTitle>
                <DialogDescription>
                  {confirmDialog.action === "suspend" &&
                    `Suspendre ${confirmDialog.member.full_name} ? Il ne pourra plus se connecter jusqu'à la réactivation.`}
                  {confirmDialog.action === "reactivate" &&
                    `Réactiver l'accès de ${confirmDialog.member.full_name} ?`}
                  {confirmDialog.action === "remove" &&
                    `Cette action est irréversible. ${confirmDialog.member.full_name} perdra l'accès au département.`}
                </DialogDescription>
              </DialogHeader>

              {confirmDialog.action === "remove" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Tapez <span className="font-mono font-medium text-foreground">{confirmDialog.member.full_name}</span> pour confirmer
                  </Label>
                  <Input
                    placeholder={confirmDialog.member.full_name}
                    value={confirmName}
                    onChange={e => setConfirmName(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setConfirmDialog(null); setConfirmName(""); }}>
                  Annuler
                </Button>
                <Button
                  variant={confirmDialog.action === "reactivate" ? "default" : "destructive"}
                  disabled={actionLoading || (
                    confirmDialog.action === "remove" &&
                    confirmName.trim().toLowerCase() !== confirmDialog.member.full_name.toLowerCase()
                  )}
                  onClick={executeAction}
                >
                  {actionLoading
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Traitement…</>
                    : confirmDialog.action === "suspend"    ? "Suspendre"
                    : confirmDialog.action === "reactivate" ? "Réactiver"
                    : "Retirer l'accès"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================
          Dialog : Confirmation réinitialisation mot de passe
      ============================================================ */}
      <Dialog open={!!resetConfirm} onOpenChange={o => { if (!o) setResetConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Un email de réinitialisation sera envoyé à{" "}
              <span className="font-medium">{resetConfirm?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetConfirm(null)}>Annuler</Button>
            <Button onClick={() => resetConfirm && handleResetPassword(resetConfirm)}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Envoyer l'email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EquipePage;
