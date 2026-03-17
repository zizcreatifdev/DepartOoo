/**
 * PlansPage — Owner
 * Gestion des plans tarifaires affichés sur la landing page.
 * Modification en temps réel : les changements sont répercutés
 * immédiatement sur la landing page (données Supabase).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard, Plus, Pencil, Trash2, Eye, EyeOff,
  GripVertical, Star, ExternalLink, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllPlans, createPlan, updatePlan,
  togglePlanActive, deletePlan,
  Plan, PlanUpsert,
} from "@/services/plans.service";

// ── Formulaire plan ──────────────────────────────────────────
const emptyForm = (): Omit<PlanUpsert, "slug"> & { slug: string } => ({
  name: "",
  slug: "",
  price_label: "Sur devis",
  period_label: "",
  description: "",
  features: [""],
  note: "",
  cta_label: "Nous contacter",
  badge: "",
  action: "contact",
  is_active: true,
  is_highlighted: false,
  display_order: 99,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ── Dialog édition ───────────────────────────────────────────
interface PlanDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: Plan | null;
  onSave: (data: PlanUpsert) => Promise<void>;
  saving: boolean;
}

function PlanDialog({ open, onClose, initial, onSave, saving }: PlanDialogProps) {
  const [form, setForm] = useState<ReturnType<typeof emptyForm>>(
    initial
      ? { ...initial, period_label: initial.period_label ?? "", note: initial.note ?? "", badge: initial.badge ?? "", description: initial.description ?? "" }
      : emptyForm()
  );

  // Sync when initial changes
  const key = initial?.id ?? "new";

  function set(k: string, v: any) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function setFeature(i: number, val: string) {
    const next = [...form.features];
    next[i] = val;
    setForm((prev) => ({ ...prev, features: next }));
  }

  function addFeature() {
    setForm((prev) => ({ ...prev, features: [...prev.features, ""] }));
  }

  function removeFeature(i: number) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Le nom est requis."); return; }
    if (!form.slug.trim()) { toast.error("Le slug est requis."); return; }
    const payload: PlanUpsert = {
      ...form,
      slug: slugify(form.slug),
      period_label: form.period_label || null,
      description: form.description || null,
      note: form.note || null,
      badge: form.badge || null,
      features: form.features.filter((f) => f.trim()),
    };
    await onSave(payload);
  }

  return (
    <Dialog key={key} open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le plan" : "Nouveau plan"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nom + Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!initial) set("slug", slugify(e.target.value));
                }}
                placeholder="Ex : Pro"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL) *</Label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="ex: pro"
              />
            </div>
          </div>

          {/* Prix + Période */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Affichage prix *</Label>
              <Input
                value={form.price_label}
                onChange={(e) => set("price_label", e.target.value)}
                placeholder="Ex : Sur devis / Gratuit"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Période (optionnel)</Label>
              <Input
                value={form.period_label ?? ""}
                onChange={(e) => set("period_label", e.target.value)}
                placeholder="Ex : · 1 mois d'essai"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description courte</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ex : Pour les départements qui veulent continuer"
            />
          </div>

          {/* Badge + CTA + Action */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Badge (optionnel)</Label>
              <Input
                value={form.badge ?? ""}
                onChange={(e) => set("badge", e.target.value)}
                placeholder="Ex : Populaire"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Texte bouton *</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => set("cta_label", e.target.value)}
                placeholder="Ex : Je suis intéressé"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action bouton</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={form.action}
                onChange={(e) => set("action", e.target.value as "login" | "contact")}
              >
                <option value="login">→ Inscription</option>
                <option value="contact">→ Email contact</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-xs">Note (ex : conditions, avertissement)</Label>
            <Input
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Ex : Après 30 jours, les fonctionnalités se verrouillent."
            />
          </div>

          {/* Fonctionnalités */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fonctionnalités incluses</Label>
            <div className="space-y-2">
              {form.features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={f}
                    onChange={(e) => setFeature(i, e.target.value)}
                    placeholder={`Fonctionnalité ${i + 1}`}
                    className="text-sm"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFeature(i)}
                    disabled={form.features.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={addFeature}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une fonctionnalité
              </Button>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Plan mis en avant</Label>
              <Switch
                checked={form.is_highlighted}
                onCheckedChange={(v) => set("is_highlighted", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Visible (actif)</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", v)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Ordre d'affichage (1 = premier)</Label>
              <Input
                type="number" min={1} max={99}
                value={form.display_order}
                onChange={(e) => set("display_order", parseInt(e.target.value) || 1)}
                className="w-24"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement..." : initial ? "Mettre à jour" : "Créer le plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page principale ──────────────────────────────────────────
const PlansPage = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["owner-plans"],
    queryFn: getAllPlans,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: PlanUpsert) => {
      if (editing) {
        await updatePlan(editing.id, payload);
        toast.success("Plan mis à jour — la landing page est mise à jour en temps réel.");
      } else {
        await createPlan(payload);
        toast.success("Plan créé — il est maintenant visible sur la landing page.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-plans"] });
      qc.invalidateQueries({ queryKey: ["landing-plans"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      togglePlanActive(id, active),
    onSuccess: (_, { active }) => {
      toast.success(active ? "Plan activé." : "Plan masqué de la landing page.");
      qc.invalidateQueries({ queryKey: ["owner-plans"] });
      qc.invalidateQueries({ queryKey: ["landing-plans"] });
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      toast.success("Plan supprimé.");
      qc.invalidateQueries({ queryKey: ["owner-plans"] });
      qc.invalidateQueries({ queryKey: ["landing-plans"] });
      setDeletingId(null);
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(p: Plan) { setEditing(p); setDialogOpen(true); }

  return (
    <DashboardLayout title="Plans tarifaires">
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Modifiez vos plans ici — la landing page se met à jour en temps réel.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open("/", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1.5" /> Voir la landing
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Nouveau plan
            </Button>
          </div>
        </div>

        {/* ── Liste plans ── */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-64 bg-muted/30 rounded-lg" />
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun plan tarifaire.</p>
              <Button className="mt-4" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Créer le premier plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.is_highlighted
                    ? "border-primary/40 shadow-md ring-1 ring-primary/20"
                    : ""
                } ${!plan.is_active ? "opacity-60" : ""}`}
              >
                {plan.is_highlighted && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="text-[10px] shadow-sm">
                      <Star className="h-2.5 w-2.5 mr-1" /> Mis en avant
                    </Badge>
                  </div>
                )}
                {!plan.is_active && (
                  <div className="absolute -top-2 right-3">
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      <EyeOff className="h-2.5 w-2.5 mr-1" /> Masqué
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        #{plan.display_order}
                      </span>
                      {plan.badge && (
                        <Badge variant="secondary" className="text-[10px]">{plan.badge}</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleMutation.mutate({ id: plan.id, active: !plan.is_active })}
                        title={plan.is_active ? "Masquer de la landing" : "Afficher sur la landing"}
                      >
                        {plan.is_active
                          ? <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => setDeletingId(plan.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-1">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black">{plan.price_label}</span>
                    {plan.period_label && (
                      <span className="text-xs text-muted-foreground">{plan.period_label}</span>
                    )}
                  </div>
                  {plan.description && (
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.note && (
                    <p className="text-[11px] text-amber-600 mt-2 pt-2 border-t">{plan.note}</p>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Action : <strong>{plan.action === "login" ? "→ Inscription" : "→ Email"}</strong></span>
                      <span>CTA : <strong>{plan.cta_label}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          💡 Les modifications sont immédiatement visibles sur la landing page pour les nouveaux visiteurs.
        </p>
      </div>

      {/* ── Dialog édition / création ── */}
      <PlanDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        initial={editing}
        onSave={async (data) => { await saveMutation.mutateAsync(data); }}
        saving={saveMutation.isPending}
      />

      {/* ── Dialog suppression ── */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer le plan ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Le plan sera retiré de la landing page.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PlansPage;
