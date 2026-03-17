/**
 * UniversitesPage — Dashboard Owner
 * Gestion des universités : création, validation, logos.
 * Route : /dashboard/owner/universites
 */
import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  University,
  updateUniversity,
  uploadLogo,
  createUniversity,
  deleteUniversity,
  countDepartmentsForUniversity,
} from "@/services/universities.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Building2, Plus, Upload, CheckCircle2, AlertCircle, Globe, ImageIcon, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────

const STOP_WORDS = new Set(["de", "du", "la", "le", "les", "des", "el", "al", "ibn", "et"]);

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const MAX_LOGO = 2 * 1024 * 1024;

type Filter = "all" | "officielle" | "a_verifier" | "sans_logo";

// ── Page ─────────────────────────────────────────────────────

const UniversitesPage = () => {
  const [universities, setUniversities]   = useState<University[]>([]);
  const [deptCounts, setDeptCounts]       = useState<Record<string, number>>({});
  const [filter, setFilter]               = useState<Filter>("all");
  const [loading, setLoading]             = useState(true);

  // ── Dialogue Ajouter ──────────────────────────────────────
  const [addOpen, setAddOpen]             = useState(false);
  const [addName, setAddName]             = useState("");
  const [addShort, setAddShort]           = useState("");
  const [addCity, setAddCity]             = useState("");
  const [addWebsite, setAddWebsite]       = useState("");
  const [addLogoFile, setAddLogoFile]     = useState<File | null>(null);
  const [addLogoPreview, setAddLogoPreview] = useState<string | null>(null);
  const [addSaving, setAddSaving]         = useState(false);
  const addFileRef                        = useRef<HTMLInputElement>(null);

  // ── Dialogue Modifier ─────────────────────────────────────
  const [editUniv, setEditUniv]           = useState<University | null>(null);
  const [editName, setEditName]           = useState("");
  const [editShort, setEditShort]         = useState("");
  const [editCity, setEditCity]           = useState("");
  const [editWebsite, setEditWebsite]     = useState("");
  const [editStatut, setEditStatut]       = useState<"officielle" | "a_verifier">("officielle");
  const [editLogoFile, setEditLogoFile]   = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving]       = useState(false);
  const editFileRef                       = useRef<HTMLInputElement>(null);

  // ── Suppression ───────────────────────────────────────────
  const [deleteUniv, setDeleteUniv]       = useState<University | null>(null);
  const [deleteNbDepts, setDeleteNbDepts] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const [univRes, deptRes] = await Promise.all([
        (supabase as any).from("universities").select("*").order("name"),
        (supabase as any)
          .from("departments")
          .select("university_id")
          .eq("onboarding_completed", true)
          .not("university_id", "is", null),
      ]);

      setUniversities((univRes.data ?? []) as University[]);

      const counts: Record<string, number> = {};
      (deptRes.data ?? []).forEach((d: any) => {
        if (d.university_id) counts[d.university_id] = (counts[d.university_id] || 0) + 1;
      });
      setDeptCounts(counts);
    } catch {
      toast.error("Erreur lors du chargement des universités.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Dérivés ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    switch (filter) {
      case "officielle":  return universities.filter((u) => u.statut === "officielle");
      case "a_verifier":  return universities.filter((u) => u.statut === "a_verifier");
      case "sans_logo":   return universities.filter((u) => !u.logo_url);
      default:            return universities;
    }
  }, [universities, filter]);

  const stats = useMemo(() => ({
    total:      universities.length,
    officielles: universities.filter((u) => u.statut === "officielle").length,
    a_verifier:  universities.filter((u) => u.statut === "a_verifier").length,
    avec_logo:   universities.filter((u) => !!u.logo_url).length,
  }), [universities]);

  // ── Actions ───────────────────────────────────────────────

  const handleValidate = async (u: University) => {
    try {
      await updateUniversity(u.id, { statut: "officielle" });
      toast.success(`${u.short_name || u.name} marquée comme officielle.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Ajouter (owner → toujours officielle)
  const handleAdd = async () => {
    if (!addName.trim()) { toast.error("Le nom est requis."); return; }
    setAddSaving(true);
    try {
      const u = await createUniversity({
        name:       addName.trim(),
        short_name: addShort.trim() || undefined,
        city:       addCity.trim()  || undefined,
        logo_file:  addLogoFile     ?? undefined,
      });
      // Passer en 'officielle' + enregistrer website
      await updateUniversity(u.id, {
        statut:  "officielle",
        website: addWebsite.trim() || undefined as any,
      });
      toast.success("Université ajoutée.");
      setAddOpen(false);
      resetAddForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  const resetAddForm = () => {
    setAddName(""); setAddShort(""); setAddCity(""); setAddWebsite("");
    setAddLogoFile(null); setAddLogoPreview(null);
  };

  const handleAddLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_LOGO) { toast.error("Logo trop lourd (max 2 Mo)."); return; }
    setAddLogoFile(f);
    setAddLogoPreview(URL.createObjectURL(f));
  };

  // Ouvrir dialogue Modifier
  const openEdit = (u: University) => {
    setEditUniv(u);
    setEditName(u.name);
    setEditShort(u.short_name ?? "");
    setEditCity(u.city ?? "");
    setEditWebsite(u.website ?? "");
    setEditStatut(u.statut);
    setEditLogoFile(null);
    setEditLogoPreview(null);
  };

  const handleEditLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_LOGO) { toast.error("Logo trop lourd (max 2 Mo)."); return; }
    setEditLogoFile(f);
    setEditLogoPreview(URL.createObjectURL(f));
  };

  const handleEditSave = async () => {
    if (!editUniv) return;
    if (!editName.trim()) { toast.error("Le nom est requis."); return; }
    setEditSaving(true);
    try {
      // Upload logo si nouveau fichier
      if (editLogoFile) {
        await uploadLogo(editUniv.id, editLogoFile);
      }
      await updateUniversity(editUniv.id, {
        name:       editName.trim(),
        short_name: editShort.trim() || null,
        city:       editCity.trim()  || null,
        website:    editWebsite.trim() || null,
        statut:     editStatut,
      });
      toast.success("Université mise à jour.");
      setEditUniv(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const openDelete = async (u: University) => {
    const nb = await countDepartmentsForUniversity(u.id);
    setDeleteNbDepts(nb);
    setDeleteUniv(u);
  };

  const handleDelete = async () => {
    if (!deleteUniv) return;
    setDeleteLoading(true);
    try {
      await deleteUniversity(deleteUniv.id);
      toast.success(`Université "${deleteUniv.name}" supprimée.`);
      setDeleteUniv(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de la suppression.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",        label: "Toutes" },
    { key: "officielle", label: "Officielles" },
    { key: "a_verifier", label: "À vérifier" },
    { key: "sans_logo",  label: "Sans logo" },
  ];

  return (
    <DashboardLayout title="Universités">
      <div className="space-y-6">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Universités</h1>
            <p className="text-muted-foreground text-sm">
              Gérez les universités partenaires et leurs logos.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une université
          </Button>
        </div>

        {/* ── Statistiques ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total",       value: stats.total,       icon: Building2,     color: "text-primary" },
            { label: "Officielles", value: stats.officielles,  icon: CheckCircle2,  color: "text-green-600" },
            { label: "À vérifier",  value: stats.a_verifier,   icon: AlertCircle,   color: "text-amber-500" },
            { label: "Avec logo",   value: stats.avec_logo,    icon: ImageIcon,     color: "text-blue-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filtres ── */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {label}
              {key === "a_verifier" && stats.a_verifier > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                  {stats.a_verifier}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* ── Tableau ── */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Logo</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Sigle</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-center">Depts actifs</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Aucune université dans cette catégorie.
                  </TableCell>
                </TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id}>
                  {/* Logo */}
                  <TableCell>
                    {u.logo_url ? (
                      <img
                        src={u.logo_url}
                        alt={u.name}
                        className="h-10 w-10 rounded object-contain border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground border">
                        {getInitials(u.name)}
                      </div>
                    )}
                  </TableCell>

                  {/* Nom */}
                  <TableCell>
                    <p className="font-medium text-sm">{u.name}</p>
                    {u.website && (
                      <a
                        href={u.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        {u.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </TableCell>

                  {/* Sigle */}
                  <TableCell className="font-mono text-sm">{u.short_name || "—"}</TableCell>

                  {/* Ville */}
                  <TableCell className="text-sm text-muted-foreground">{u.city || "—"}</TableCell>

                  {/* Depts actifs */}
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{deptCounts[u.id] ?? 0}</span>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    {u.statut === "officielle" ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                        Officielle
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        À vérifier
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.statut === "a_verifier" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50 h-7 text-xs"
                          onClick={() => handleValidate(u)}
                        >
                          Valider
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => openEdit(u)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => openDelete(u)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ════ DIALOGUE AJOUTER ════ */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetAddForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une université</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom complet *</Label>
              <Input
                placeholder="Ex: Université de Lomé"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sigle</Label>
                <Input placeholder="Ex: UL" value={addShort} onChange={(e) => setAddShort(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Input placeholder="Ex: Lomé" value={addCity} onChange={(e) => setAddCity(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Site web</Label>
              <Input placeholder="https://..." value={addWebsite} onChange={(e) => setAddWebsite(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Logo (PNG/JPG/SVG/WebP, max 2 Mo)</Label>
              <div className="flex items-center gap-3">
                {addLogoPreview && (
                  <img src={addLogoPreview} alt="Aperçu" className="h-12 w-12 rounded border object-contain" />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {addLogoPreview ? "Changer" : "Ajouter le logo"}
                </Button>
                <input
                  ref={addFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleAddLogo}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Statut : <span className="font-medium text-green-600">Officielle</span> (créée par l'owner Departo)
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={addSaving}>
              {addSaving ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DIALOGUE MODIFIER ════ */}
      <Dialog open={!!editUniv} onOpenChange={(o) => { if (!o) setEditUniv(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'université</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom complet *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sigle</Label>
                <Input value={editShort} onChange={(e) => setEditShort(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Site web</Label>
              <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
            </div>

            {/* Section logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {/* Logo actuel ou nouveau aperçu */}
                {editLogoPreview ? (
                  <img src={editLogoPreview} alt="Aperçu" className="h-12 w-12 rounded border object-contain" />
                ) : editUniv?.logo_url ? (
                  <img src={editUniv.logo_url} alt="Logo actuel" className="h-12 w-12 rounded border object-contain" />
                ) : (
                  <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {editUniv ? getInitials(editUniv.name) : "—"}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editFileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {editUniv?.logo_url ? "Remplacer le logo" : "Ajouter le logo"}
                </Button>
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleEditLogo}
                />
              </div>
              {editLogoPreview && (
                <p className="text-xs text-muted-foreground">Nouveau logo sélectionné — sera uploadé à la sauvegarde.</p>
              )}
            </div>

            {/* Statut toggle */}
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={editStatut === "officielle" ? "default" : "outline"}
                  onClick={() => setEditStatut("officielle")}
                  className={editStatut === "officielle" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Officielle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={editStatut === "a_verifier" ? "default" : "outline"}
                  onClick={() => setEditStatut("a_verifier")}
                  className={editStatut === "a_verifier" ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                  À vérifier
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUniv(null)}>Annuler</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Sauvegarde…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ════ DIALOGUE SUPPRIMER ════ */}
      <AlertDialog open={!!deleteUniv} onOpenChange={(o) => { if (!o) setDeleteUniv(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'université ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Tu vas supprimer <strong>{deleteUniv?.name}</strong>.
              </span>
              {deleteNbDepts > 0 ? (
                <span className="block text-destructive font-medium">
                  ⚠️ Cette université a {deleteNbDepts} département{deleteNbDepts > 1 ? "s" : ""} lié{deleteNbDepts > 1 ? "s" : ""}.
                  La suppression est bloquée — retire d'abord les départements.
                </span>
              ) : (
                <span className="block text-muted-foreground">
                  Aucun département lié. Cette action est irréversible.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {deleteNbDepts === 0 && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Suppression…" : "Supprimer"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default UniversitesPage;
