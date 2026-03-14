import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, AlertTriangle, CheckCircle, Archive, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  actif: { label: "Actif", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  obsolete: { label: "Obsolète", icon: <AlertTriangle className="h-3 w-3" />, variant: "secondary" },
  archive: { label: "Archivé", icon: <Archive className="h-3 w-3" />, variant: "outline" },
};

const TYPE_LABELS: Record<string, string> = {
  emploi_du_temps: "Emploi du temps",
  releve_notes: "Relevé de notes",
  convocation: "Convocation examen",
  fiche_presence: "Fiche de présence",
  pv_deliberation: "PV de délibération",
  heures_complementaires: "Heures complémentaires",
  autre: "Autre",
};

const DocumentsPage = () => {
  const { department, role } = useAuth();
  const canEdit = role === "chef" || role === "assistant";

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("department_id", department.id)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [department]);

  const markObsolete = async (id: string) => {
    const { error } = await supabase.from("documents").update({ status: "obsolete" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document marqué comme obsolète");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce document ?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document supprimé");
    fetchData();
  };

  const downloadDoc = async (doc: any) => {
    if (!doc.file_path) {
      toast.error("Aucun fichier associé");
      return;
    }
    const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
    if (error) { toast.error("Erreur de téléchargement"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = doc.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueYears = [...new Set(documents.map(d => d.academic_year))].sort().reverse();
  const uniqueTypes = [...new Set(documents.map(d => d.type))].sort();

  const filtered = documents.filter(d => {
    if (filterType !== "all" && d.type !== filterType) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (filterYear !== "all" && d.academic_year !== filterYear) return false;
    return true;
  });

  return (
    <DashboardLayout title="Documents">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {uniqueTypes.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="obsolete">Obsolète</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes années</SelectItem>
                {uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs">{filtered.length} document(s)</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Aucun document généré</p>
                <p className="text-muted-foreground text-xs">Les documents exportés depuis les autres modules apparaîtront ici.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Généré par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(doc => {
                    const statusCfg = STATUS_MAP[doc.status] || STATUS_MAP.actif;
                    return (
                      <TableRow key={doc.id} className={doc.status === "obsolete" ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[doc.type] || doc.type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{doc.academic_year}</TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant} className="text-[10px] gap-0.5">
                            {statusCfg.icon} {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{doc.generated_by_name || "—"}</TableCell>
                        <TableCell className="text-xs">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {doc.file_path && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDoc(doc)} title="Télécharger">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canEdit && doc.status === "actif" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => markObsolete(doc.id)} title="Marquer obsolète">
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canEdit && role === "chef" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc.id)} title="Supprimer">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DocumentsPage;
