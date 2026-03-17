/**
 * ComptabilitePage — Owner
 * Gestion comptable : recettes (paiements chefs) + dépenses.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2,
  ArrowDownCircle, ArrowUpCircle, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecettes, getDepenses, createDepense, updateDepense, deleteDepense,
  formatFCFA, CATEGORIE_LABELS, DepenseCategorie, DepenseCreate, Depense,
} from "@/services/comptabilite.service";

// ── Helpers ───────────────────────────────────────────────

function currentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

function monthRange(ym: string): { debut: string; fin: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { debut: `${ym}-01`, fin: `${ym}-${String(last).padStart(2, "0")}` };
}

const MODE_PAIEMENT_OPTIONS = ["Wave", "Orange Money", "Virement", "Espèces", "Autre"];

// ── Composant ─────────────────────────────────────────────

const ComptabilitePage = () => {
  const qc = useQueryClient();

  // Filtre mois (format YYYY-MM)
  const [mois, setMois] = useState(currentMonth());
  const { debut, fin } = useMemo(() => monthRange(mois), [mois]);

  // ── Queries ─────────────────────────────────────────────
  const { data: recettes = [], isLoading: loadR } = useQuery({
    queryKey: ["owner-recettes", mois],
    queryFn:  () => getRecettes(debut, fin),
  });

  const { data: depenses = [], isLoading: loadD } = useQuery({
    queryKey: ["owner-depenses", mois],
    queryFn:  () => getDepenses(debut, fin),
  });

  const totalRecettes = recettes.reduce((s, r) => s + r.montant, 0);
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const solde         = totalRecettes - totalDepenses;

  // ── État du dialog dépense ───────────────────────────────
  const EMPTY_DEP: DepenseCreate = {
    categorie:     "autres",
    libelle:       "",
    montant:       0,
    date_depense:  new Date().toISOString().split("T")[0],
    mode_paiement: null,
    note:          null,
  };

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState<Depense | null>(null);
  const [form, setForm]               = useState<DepenseCreate>(EMPTY_DEP);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_DEP, date_depense: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  }

  function openEdit(d: Depense) {
    setEditing(d);
    setForm({
      categorie:     d.categorie,
      libelle:       d.libelle,
      montant:       d.montant,
      date_depense:  d.date_depense,
      mode_paiement: d.mode_paiement,
      note:          d.note,
    });
    setDialogOpen(true);
  }

  // ── Mutations ────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["owner-depenses"] });
    qc.invalidateQueries({ queryKey: ["owner-comptabilite"] });
  };

  const mutCreate = useMutation({
    mutationFn: (d: DepenseCreate) => createDepense(d),
    onSuccess: () => { invalidate(); toast.success("Dépense ajoutée"); setDialogOpen(false); },
    onError:   (e: any) => toast.error(e.message),
  });

  const mutUpdate = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<DepenseCreate> }) => updateDepense(id, d),
    onSuccess: () => { invalidate(); toast.success("Dépense mise à jour"); setDialogOpen(false); },
    onError:   (e: any) => toast.error(e.message),
  });

  const mutDelete = useMutation({
    mutationFn: (id: string) => deleteDepense(id),
    onSuccess: () => { invalidate(); toast.success("Dépense supprimée"); },
    onError:   (e: any) => toast.error(e.message),
  });

  function handleSave() {
    if (!form.libelle.trim()) return toast.error("Le libellé est requis");
    if (!form.montant || form.montant <= 0) return toast.error("Le montant doit être positif");
    if (editing) {
      mutUpdate.mutate({ id: editing.id, d: form });
    } else {
      mutCreate.mutate(form);
    }
  }

  // ── Couleurs statut solde ────────────────────────────────
  const soldeColor = solde >= 0 ? "text-emerald-600" : "text-red-600";

  // ── Badge couleur catégorie ──────────────────────────────
  const catColor: Record<DepenseCategorie, string> = {
    hebergement:   "bg-blue-50 text-blue-700",
    outils:        "bg-violet-50 text-violet-700",
    marketing:     "bg-orange-50 text-orange-700",
    salaires:      "bg-amber-50 text-amber-700",
    communication: "bg-cyan-50 text-cyan-700",
    autres:        "bg-gray-100 text-gray-600",
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <DashboardLayout title="Comptabilité">
      <div className="space-y-6">

        {/* ── Filtre mois ── */}
        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">Mois :</Label>
          <Input
            type="month"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="w-44"
          />
        </div>

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                Recettes
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatFCFA(totalRecettes)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{recettes.length} paiement{recettes.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-400">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <ArrowDownCircle className="h-4 w-4 text-red-400" />
                Dépenses
              </div>
              <p className="text-xl font-bold text-red-500">{formatFCFA(totalDepenses)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{depenses.length} dépense{depenses.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${solde >= 0 ? "border-l-blue-500" : "border-l-red-500"}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Wallet className="h-4 w-4 text-blue-500" />
                Solde du mois
              </div>
              <p className={`text-xl font-bold ${soldeColor}`}>{formatFCFA(solde)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {solde >= 0 ? "Bénéfice" : "Déficit"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Onglets ── */}
        <Tabs defaultValue="recettes">
          <TabsList>
            <TabsTrigger value="recettes" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Recettes ({recettes.length})
            </TabsTrigger>
            <TabsTrigger value="depenses" className="gap-1.5">
              <TrendingDown className="h-4 w-4" />
              Dépenses ({depenses.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Onglet Recettes ── */}
          <TabsContent value="recettes" className="mt-4">
            {loadR ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
            ) : recettes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune recette déclarée pour ce mois.</p>
                <p className="text-xs mt-1">
                  Les recettes proviennent des paiements marqués comme « Payé » dans{" "}
                  <span className="font-medium">Licences & Paiements</span>.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Département</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Université</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Mode</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recettes.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{r.department_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell text-xs">
                          {r.university ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {new Date(r.date_paiement).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          {r.mode_paiement ? (
                            <Badge variant="outline" className="text-[10px]">{r.mode_paiement}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                          +{formatFCFA(r.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm font-medium">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-600">
                        {formatFCFA(totalRecettes)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Onglet Dépenses ── */}
          <TabsContent value="depenses" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Ajouter une dépense
              </Button>
            </div>

            {loadD ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
            ) : depenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune dépense ce mois-ci.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Libellé</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Catégorie</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Mode</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Montant</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {depenses.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{d.libelle}</p>
                          {d.note && (
                            <p className="text-xs text-muted-foreground mt-0.5">{d.note}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catColor[d.categorie]}`}>
                            {CATEGORIE_LABELS[d.categorie]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {new Date(d.date_depense).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          {d.mode_paiement ? (
                            <Badge variant="outline" className="text-[10px]">{d.mode_paiement}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-500">
                          -{formatFCFA(d.montant)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(d)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Supprimer cette dépense ?")) mutDelete.mutate(d.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-sm font-medium">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-red-500" colSpan={1}>
                        {/* (shown in KPI card above) */}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-1 text-xs text-muted-foreground">Total dépenses</td>
                      <td className="px-4 py-1 text-right font-bold text-red-500 text-sm">
                        -{formatFCFA(totalDepenses)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog Dépense ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Catégorie */}
            <div className="space-y-1.5">
              <Label className="text-xs">Catégorie *</Label>
              <Select
                value={form.categorie}
                onValueChange={(v) => setForm({ ...form, categorie: v as DepenseCategorie })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORIE_LABELS) as [DepenseCategorie, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Libellé */}
            <div className="space-y-1.5">
              <Label className="text-xs">Libellé *</Label>
              <Input
                placeholder="ex: Abonnement Supabase Pro"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              />
            </div>

            {/* Montant */}
            <div className="space-y-1.5">
              <Label className="text-xs">Montant (FCFA) *</Label>
              <Input
                type="number"
                min={1}
                placeholder="5000"
                value={form.montant || ""}
                onChange={(e) => setForm({ ...form, montant: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs">Date de la dépense *</Label>
              <Input
                type="date"
                value={form.date_depense}
                onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
              />
            </div>

            {/* Mode paiement */}
            <div className="space-y-1.5">
              <Label className="text-xs">Mode de paiement</Label>
              <Select
                value={form.mode_paiement ?? "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, mode_paiement: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="— Optionnel —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Optionnel —</SelectItem>
                  {MODE_PAIEMENT_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Textarea
                rows={2}
                placeholder="Détails supplémentaires…"
                value={form.note ?? ""}
                onChange={(e) => setForm({ ...form, note: e.target.value || null })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={mutCreate.isPending || mutUpdate.isPending}
            >
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ComptabilitePage;
