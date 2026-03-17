/**
 * LicencesPage — Owner
 * Gestion des licences (dates expiration) et des paiements.
 * Toutes les données sont réelles — aucune info fictive.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  CalendarClock, CreditCard, Plus, Pencil, CheckCircle2,
  AlertTriangle, Building2, Trash2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getLicences, updateLicence, LicenceDept,
  getPaiements, createPaiement, updatePaiement,
  marquerPaye, deletePaiement, Paiement, PaiementCreate,
} from "@/services/licences.service";

// ── Helpers ──────────────────────────────────────────────────

function offreLabel(offre: string) {
  return { starter: "Starter", pro: "Pro", universite: "Université" }[offre] ?? offre;
}

function joursColor(jours: number | null) {
  if (jours === null) return "outline";
  if (jours <= 14) return "destructive";
  if (jours <= 30) return "secondary";
  return "outline";
}

function statutColor(statut: string) {
  return {
    paye: "text-emerald-600 bg-emerald-50 border-emerald-200",
    en_attente: "text-amber-600 bg-amber-50 border-amber-200",
    en_retard: "text-red-600 bg-red-50 border-red-200",
    annule: "text-muted-foreground bg-muted border-border",
  }[statut] ?? "";
}

function statutLabel(statut: string) {
  return { paye: "Payé", en_attente: "En attente", en_retard: "En retard", annule: "Annulé" }[statut] ?? statut;
}

// ── Dialog licence ────────────────────────────────────────────
function LicenceDialog({
  open, onClose, dept, saving,
  onSave,
}: {
  open: boolean; onClose: () => void;
  dept: LicenceDept | null; saving: boolean;
  onSave: (id: string, data: any) => Promise<void>;
}) {
  const [offre, setOffre] = useState(dept?.offre ?? "starter");
  const [debut, setDebut] = useState(dept?.licence_debut ?? "");
  const [expire, setExpire] = useState(dept?.licence_expire ?? "");
  const [note, setNote] = useState(dept?.licence_note ?? "");

  if (!dept) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifier la licence — {dept.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Offre</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={offre}
              onChange={(e) => setOffre(e.target.value)}
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="universite">Université</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date début</Label>
              <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date expiration</Label>
              <Input type="date" value={expire} onChange={(e) => setExpire(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note interne</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : renouvellement en discussion"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={saving}
            onClick={() => onSave(dept.id, {
              offre,
              licence_debut: debut || null,
              licence_expire: expire || null,
              licence_note: note || null,
            })}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog paiement ───────────────────────────────────────────
function PaiementDialog({
  open, onClose, depts, initial, saving, onSave,
}: {
  open: boolean; onClose: () => void;
  depts: LicenceDept[]; initial: Paiement | null; saving: boolean;
  onSave: (data: PaiementCreate, id?: string) => Promise<void>;
}) {
  const [deptId, setDeptId] = useState(initial?.department_id ?? "");
  const [montant, setMontant] = useState(String(initial?.montant ?? ""));
  const [echeance, setEcheance] = useState(initial?.date_echeance ?? "");
  const [datePaiement, setDatePaiement] = useState(initial?.date_paiement ?? "");
  const [statut, setStatut] = useState<PaiementCreate["statut"]>(initial?.statut ?? "en_attente");
  const [mode, setMode] = useState(initial?.mode_paiement ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  async function handleSubmit() {
    if (!deptId) { toast.error("Sélectionne un département."); return; }
    if (!montant || isNaN(Number(montant))) { toast.error("Montant invalide."); return; }
    if (!echeance) { toast.error("Date d'échéance requise."); return; }

    const payload: PaiementCreate = {
      department_id: deptId,
      montant: Number(montant),
      date_echeance: echeance,
      date_paiement: datePaiement || null,
      statut,
      mode_paiement: mode || null,
      note: note || null,
    };
    await onSave(payload, initial?.id);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le paiement" : "Nouveau paiement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Département *</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
            >
              <option value="">-- Choisir --</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {d.university ? `— ${d.university}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Montant (FCFA) *</Label>
              <Input
                type="number" min={0} placeholder="Ex : 75000"
                value={montant} onChange={(e) => setMontant(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode de paiement</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={mode} onChange={(e) => setMode(e.target.value)}
              >
                <option value="">—</option>
                <option value="wave">Wave</option>
                <option value="om">Orange Money</option>
                <option value="virement">Virement</option>
                <option value="especes">Espèces</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Échéance *</Label>
              <Input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date de paiement</Label>
              <Input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Statut</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={statut} onChange={(e) => setStatut(e.target.value as any)}
            >
              <option value="en_attente">En attente</option>
              <option value="paye">Payé</option>
              <option value="en_retard">En retard</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note interne</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : 2ème versement" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={saving} onClick={handleSubmit}>
            {saving ? "Enregistrement..." : initial ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────
const LicencesPage = () => {
  const qc = useQueryClient();
  const [licenceDialogDept, setLicenceDialogDept] = useState<LicenceDept | null>(null);
  const [paiementDialog, setPaiementDialog] = useState<{ open: boolean; initial: Paiement | null }>({ open: false, initial: null });

  const { data: licences = [], isLoading: loadingLicences, refetch: refetchLicences } = useQuery({
    queryKey: ["owner-licences"], queryFn: getLicences, staleTime: 30_000,
  });
  const { data: paiements = [], isLoading: loadingPaiements, refetch: refetchPaiements } = useQuery({
    queryKey: ["owner-paiements"], queryFn: getPaiements, staleTime: 30_000,
  });

  const licenceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateLicence(id, data),
    onSuccess: () => {
      toast.success("Licence mise à jour.");
      qc.invalidateQueries({ queryKey: ["owner-licences"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard-licences"] });
      setLicenceDialogDept(null);
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  const paiementMutation = useMutation({
    mutationFn: async ({ data, id }: { data: PaiementCreate; id?: string }) => {
      if (id) await updatePaiement(id, data);
      else await createPaiement(data);
    },
    onSuccess: (_, { id }) => {
      toast.success(id ? "Paiement mis à jour." : "Paiement enregistré.");
      qc.invalidateQueries({ queryKey: ["owner-paiements"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard-paiements"] });
      setPaiementDialog({ open: false, initial: null });
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  const payerMutation = useMutation({
    mutationFn: (id: string) => marquerPaye(id),
    onSuccess: () => {
      toast.success("Paiement marqué comme reçu ✓");
      qc.invalidateQueries({ queryKey: ["owner-paiements"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard-paiements"] });
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaiement(id),
    onSuccess: () => {
      toast.success("Paiement supprimé.");
      qc.invalidateQueries({ queryKey: ["owner-paiements"] });
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  // Stats
  const nbExpirantBientot = licences.filter(l => l.jours_restants !== null && l.jours_restants <= 30).length;
  const nbEnRetard = paiements.filter(p => p.statut === "en_retard" || (p.statut === "en_attente" && p.date_echeance < new Date().toISOString().split("T")[0])).length;
  const totalEnAttente = paiements.filter(p => p.statut !== "paye" && p.statut !== "annule").reduce((s, p) => s + p.montant, 0);

  return (
    <DashboardLayout title="Licences & Paiements">
      <div className="space-y-6">

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{nbExpirantBientot}</p>
                <p className="text-xs text-muted-foreground">Expirent dans 30 j</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{nbEnRetard}</p>
                <p className="text-xs text-muted-foreground">Paiements en retard</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalEnAttente.toLocaleString("fr-FR")} <span className="text-sm font-normal">FCFA</span></p>
                <p className="text-xs text-muted-foreground">Total en attente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="licences">
          <TabsList>
            <TabsTrigger value="licences">Licences ({licences.length})</TabsTrigger>
            <TabsTrigger value="paiements">Paiements ({paiements.length})</TabsTrigger>
          </TabsList>

          {/* ── Tab Licences ── */}
          <TabsContent value="licences" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" /> Dates de licence par département
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetchLicences()}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLicences ? (
                  <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                ) : licences.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aucun département actif.</p>
                ) : (
                  <div className="space-y-2">
                    {licences.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{l.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {offreLabel(l.offre)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            {l.university && <span>{l.university}</span>}
                            {l.licence_debut && <span>Début : {new Date(l.licence_debut).toLocaleDateString("fr-FR")}</span>}
                            {l.licence_expire && <span>Expire : <strong>{new Date(l.licence_expire).toLocaleDateString("fr-FR")}</strong></span>}
                            {!l.licence_expire && <span className="text-amber-600">⚠ Pas de date d'expiration</span>}
                            {l.licence_note && <span className="italic">"{l.licence_note}"</span>}
                          </div>
                        </div>
                        {l.jours_restants !== null && (
                          <Badge variant={joursColor(l.jours_restants)} className="shrink-0">
                            {l.jours_restants > 0 ? `${l.jours_restants}j` : "Expiré"}
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setLicenceDialogDept(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab Paiements ── */}
          <TabsContent value="paiements" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Historique des paiements
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => refetchPaiements()}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
                    </Button>
                    <Button size="sm" onClick={() => setPaiementDialog({ open: true, initial: null })}>
                      <Plus className="h-4 w-4 mr-1" /> Nouveau paiement
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPaiements ? (
                  <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                ) : paiements.length === 0 ? (
                  <div className="py-12 text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
                    <Button className="mt-4" size="sm" onClick={() => setPaiementDialog({ open: true, initial: null })}>
                      <Plus className="h-4 w-4 mr-1" /> Enregistrer le premier paiement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paiements.map((p) => (
                      <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        p.statut === "en_retard" || (p.statut === "en_attente" && p.date_echeance < new Date().toISOString().split("T")[0])
                          ? "bg-red-50 border-red-200"
                          : p.statut === "paye" ? "bg-emerald-50/30 border-emerald-100" : "bg-card"
                      }`}>
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{p.department_name}</p>
                            {p.university && <span className="text-xs text-muted-foreground truncate">{p.university}</span>}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statutColor(p.statut)}`}>
                              {statutLabel(p.statut)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            <span className="font-semibold text-foreground">{p.montant.toLocaleString("fr-FR")} FCFA</span>
                            <span>Échéance : {new Date(p.date_echeance).toLocaleDateString("fr-FR")}</span>
                            {p.date_paiement && <span>Payé le : {new Date(p.date_paiement).toLocaleDateString("fr-FR")}</span>}
                            {p.mode_paiement && <span>via {p.mode_paiement}</span>}
                            {p.note && <span className="italic">"{p.note}"</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {p.statut !== "paye" && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-xs text-emerald-600 hover:text-emerald-700 h-7"
                              disabled={payerMutation.isPending}
                              onClick={() => payerMutation.mutate(p.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Payé
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setPaiementDialog({ open: true, initial: p })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                            onClick={() => { if (confirm("Supprimer ce paiement ?")) deleteMutation.mutate(p.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ── */}
      <LicenceDialog
        open={!!licenceDialogDept} onClose={() => setLicenceDialogDept(null)}
        dept={licenceDialogDept} saving={licenceMutation.isPending}
        onSave={async (id, data) => { await licenceMutation.mutateAsync({ id, data }); }}
      />

      <PaiementDialog
        open={paiementDialog.open}
        onClose={() => setPaiementDialog({ open: false, initial: null })}
        depts={licences}
        initial={paiementDialog.initial}
        saving={paiementMutation.isPending}
        onSave={async (data, id) => { await paiementMutation.mutateAsync({ data, id }); }}
      />
    </DashboardLayout>
  );
};

export default LicencesPage;
