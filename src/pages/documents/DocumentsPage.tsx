import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText, Download, AlertTriangle, CheckCircle,
  Archive, RefreshCw, Mail, Search, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  getDocuments, marquerObsolete, downloadDocument,
  type Document,
} from "@/services/documents.service";

// ============================================================
// Constantes
// ============================================================

const TYPE_LABELS: Record<string, string> = {
  emploi_du_temps:       "Emploi du temps",
  liste_presence:        "Liste de présence",
  convocation:           "Convocation examen",
  fiche_vacation:        "Fiche de vacation",
  releve_notes:          "Relevé de notes",
  liste_resultats:       "Liste de résultats",
  rapport_perturbations: "Rapport perturbations",
};

// Route de re-génération selon le type de document
const TYPE_ROUTES: Record<string, string> = {
  emploi_du_temps:       "emploi-du-temps",
  liste_presence:        "presences",
  convocation:           "examens",
  fiche_vacation:        "enseignants",
  releve_notes:          "notes",
  liste_resultats:       "notes",
  rapport_perturbations: "perturbations",
};

// ============================================================
// Badge statut coloré
// ============================================================

function StatutBadge({ status }: { status: string }) {
  if (status === "actif") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-0.5 text-[10px]">
        <CheckCircle className="h-3 w-3" /> Actif
      </Badge>
    );
  }
  if (status === "obsolete") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-0.5 text-[10px]">
        <AlertTriangle className="h-3 w-3" /> Obsolète
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-0.5 text-[10px]">
      <Archive className="h-3 w-3" /> Archivé
    </Badge>
  );
}

// ============================================================
// Page principale
// ============================================================

const DocumentsPage = () => {
  const { department, role } = useAuth();
  const navigate = useNavigate();
  const canEdit = role === "chef" || role === "assistant";

  // ---- État données ----
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Filtres ----
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth,  setFilterMonth]  = useState("all");
  const [search,       setSearch]       = useState("");

  // ---- Dialog email ----
  const [emailDoc,     setEmailDoc]     = useState<Document | null>(null);
  const [emailDest,    setEmailDest]    = useState("");
  const [emailSending, setEmailSending] = useState(false);

  // ---- Fetch ----
  const fetchData = async () => {
    if (!department) return;
    setLoading(true);
    try {
      const data = await getDocuments(department.id, {
        type:   filterType,
        status: filterStatus,
        month:  filterMonth,
      });
      setDocuments(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [department, filterType, filterStatus, filterMonth]);

  // Filtre texte réactif côté client (sans re-fetch)
  const filtered = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      d => d.title?.toLowerCase().includes(q) || d.file_name?.toLowerCase().includes(q),
    );
  }, [documents, search]);

  // Mois uniques dérivés des données
  const uniqueMonths = useMemo(() => {
    const months = new Set(documents.map(d => d.created_at.substring(0, 7)));
    return [...months].sort().reverse();
  }, [documents]);

  function labelMonth(ym: string) {
    const [y, m] = ym.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMMM yyyy", { locale: fr });
  }

  // ---- Actions ----
  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocument(doc);
    } catch (err: any) {
      toast.error(err.message ?? "Erreur de téléchargement");
    }
  };

  const handleMarkObsolete = async (id: string) => {
    try {
      await marquerObsolete(id);
      toast.success("Document marqué comme obsolète");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRegenerate = (doc: Document) => {
    const segment = TYPE_ROUTES[doc.type];
    if (!segment) {
      toast.info("Naviguez vers le module source pour re-générer ce document.");
      return;
    }
    navigate(`/dashboard/${role}/${segment}`);
  };

  const handleSendEmail = async () => {
    if (!emailDoc || !emailDest.trim()) return;
    setEmailSending(true);
    try {
      // Simulation — à connecter à un vrai service email
      await new Promise(r => setTimeout(r, 800));
      toast.success(`Document envoyé à ${emailDest}`);
      setEmailDoc(null);
      setEmailDest("");
    } finally {
      setEmailSending(false);
    }
  };

  // ============================================================
  // Rendu
  // ============================================================

  return (
    <DashboardLayout title="Documents">
      <div className="space-y-4">

        {/* ---- Barre de filtres ---- */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-9 w-52 text-sm"
                placeholder="Titre ou fichier…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Type */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-[200px] text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Statut */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-[140px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="obsolete">Obsolète</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>

            {/* Mois */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-[160px] text-sm">
                <SelectValue placeholder="Tous les mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {uniqueMonths.map(ym => (
                  <SelectItem key={ym} value={ym}>{labelMonth(ym)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Badge variant="outline" className="text-xs shrink-0">
            {filtered.length} document{filtered.length > 1 ? "s" : ""}
          </Badge>
        </div>

        {/* ---- Tableau ---- */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucun document trouvé</p>
                <p className="text-xs text-muted-foreground">
                  Les documents exportés depuis les autres modules apparaissent ici.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Généré par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[130px] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(doc => (
                    <TableRow
                      key={doc.id}
                      className={doc.status === "obsolete" ? "opacity-60" : ""}
                    >
                      {/* Type */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                          {TYPE_LABELS[doc.type] || doc.type}
                        </Badge>
                      </TableCell>

                      {/* Titre */}
                      <TableCell className="font-medium text-sm max-w-[260px]">
                        <span className="block truncate" title={doc.title}>
                          {doc.title}
                        </span>
                      </TableCell>

                      {/* Généré par */}
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.generated_by_name || "—"}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(doc.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <StatutBadge status={doc.status} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex gap-1 justify-end pr-1">

                          {/* Télécharger */}
                          {doc.file_path && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              title="Télécharger"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Re-générer (si obsolète) */}
                          {canEdit && doc.status === "obsolete" && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700"
                              title="Naviguer vers le module source pour re-générer"
                              onClick={() => handleRegenerate(doc)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Marquer obsolète (si actif) */}
                          {canEdit && doc.status === "actif" && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700"
                              title="Marquer comme obsolète"
                              onClick={() => handleMarkObsolete(doc.id)}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Envoyer par email */}
                          {canEdit && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Envoyer par email"
                              onClick={() => { setEmailDoc(doc); setEmailDest(""); }}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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
          Dialog : envoi par email
      ============================================================ */}
      <Dialog open={!!emailDoc} onOpenChange={o => { if (!o) setEmailDoc(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer par email</DialogTitle>
            <DialogDescription className="truncate text-xs">
              {emailDoc?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse email du destinataire</label>
              <Input
                type="email"
                placeholder="prenom.nom@universite.dz"
                value={emailDest}
                onChange={e => setEmailDest(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSendEmail(); }}
              />
            </div>

            {emailDoc && (
              <div className="rounded-md bg-muted p-3 text-xs space-y-0.5 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Fichier : </span>
                  {emailDoc.file_name}
                </p>
                {!emailDoc.file_path && (
                  <p className="text-amber-600 mt-1">
                    ⚠ Ce document n'a pas été sauvegardé dans Storage — seul le lien sera envoyé.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDoc(null)}>
                Annuler
              </Button>
              <Button
                disabled={!emailDest.trim() || emailSending}
                onClick={handleSendEmail}
              >
                {emailSending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Envoi…</>
                  : <><Mail className="h-3.5 w-3.5 mr-1.5" />Envoyer</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DocumentsPage;
