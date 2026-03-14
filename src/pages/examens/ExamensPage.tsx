import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Plus, Edit2, Trash2, FileText, Clock, CheckCircle, AlertTriangle, Download, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import ExamenFormDialog from "@/components/examens/ExamenFormDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  en_attente: { label: "En attente", variant: "secondary" },
  recu: { label: "Reçu", variant: "default" },
  en_retard: { label: "En retard", variant: "destructive" },
};

const ExamensPage = () => {
  const { department, role } = useAuth();
  const canEdit = role === "chef" || role === "assistant";
  const academicYear = getCurrentAcademicYear();

  const [examens, setExamens] = useState<any[]>([]);
  const [ues, setUes] = useState<any[]>([]);
  const [salles, setSalles] = useState<any[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExamen, setEditExamen] = useState<any>(null);
  const [filterSession, setFilterSession] = useState<string>("all");

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);

    const [exRes, ueRes, salleRes, ensRes, studRes] = await Promise.all([
      supabase.from("examens").select(`
        *, 
        unites_enseignement(name, maquette_id, maquettes(level, semestre)),
        examen_salles(salle_id, salles(name, type, capacity)),
        examen_surveillants(enseignant_id, enseignants(first_name, last_name)),
        examen_sujets(*)
      `).eq("department_id", department.id).eq("academic_year", academicYear).order("exam_date"),
      supabase.from("unites_enseignement")
        .select("id, name, maquettes!inner(department_id, level)")
        .eq("maquettes.department_id", department.id),
      supabase.from("salles").select("id, name, type, capacity").eq("department_id", department.id),
      supabase.from("enseignants").select("id, first_name, last_name").eq("department_id", department.id).eq("is_active", true),
      supabase.from("students").select("id, first_name, last_name, student_number, group_name, level").eq("department_id", department.id).eq("is_active", true).order("last_name"),
    ]);

    setExamens(exRes.data || []);
    setUes((ueRes.data || []).map((u: any) => ({ id: u.id, name: u.name, level: u.maquettes?.level || "" })));
    setSalles(salleRes.data || []);
    setEnseignants(ensRes.data || []);
    setStudents(studRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [department]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet examen ?")) return;
    // Delete associations first
    await Promise.all([
      supabase.from("examen_salles").delete().eq("examen_id", id),
      supabase.from("examen_surveillants").delete().eq("examen_id", id),
      supabase.from("examen_sujets").delete().eq("examen_id", id),
      supabase.from("examen_resultats").delete().eq("examen_id", id),
    ]);
    const { error } = await supabase.from("examens").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Examen supprimé");
    fetchData();
  };

  const openEdit = (ex: any) => {
    setEditExamen({
      id: ex.id,
      ue_id: ex.ue_id,
      exam_date: ex.exam_date,
      start_time: ex.start_time,
      end_time: ex.end_time,
      session_type: ex.session_type,
      academic_year: ex.academic_year,
      notes: ex.notes,
      salles: (ex.examen_salles || []).map((s: any) => s.salle_id),
      surveillants: (ex.examen_surveillants || []).map((s: any) => s.enseignant_id),
      sujet_deadline: ex.examen_sujets?.[0]?.deadline || null,
    });
    setDialogOpen(true);
  };

  const getSujetStatus = (ex: any) => {
    const sujet = ex.examen_sujets?.[0];
    if (!sujet) return "en_attente";
    if (sujet.status === "recu") return "recu";
    if (sujet.deadline && new Date(sujet.deadline) < new Date()) return "en_retard";
    return "en_attente";
  };

  const filtered = filterSession === "all" ? examens : examens.filter(e => e.session_type === filterSession);

  const exportConvocationPDF = (ex: any) => {
    const ueName = ex.unites_enseignement?.name || "UE";
    const level = ex.unites_enseignement?.maquettes?.level || "";
    // Filter active students by level
    const concerned = students.filter(s => s.level === level);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Convocation d'examen", 14, 20);
    doc.setFontSize(11);
    doc.text(`UE : ${ueName}`, 14, 30);
    doc.text(`Date : ${format(new Date(ex.exam_date), "EEEE d MMMM yyyy", { locale: fr })}`, 14, 37);
    doc.text(`Horaire : ${ex.start_time?.substring(0, 5)} - ${ex.end_time?.substring(0, 5)}`, 14, 44);
    doc.text(`Session : ${ex.session_type === "normale" ? "Normale" : "Rattrapage"}`, 14, 51);

    const salleNames = (ex.examen_salles || []).map((s: any) => s.salles?.name).filter(Boolean).join(", ");
    doc.text(`Salle(s) : ${salleNames || "Non assignée"}`, 14, 58);

    autoTable(doc, {
      startY: 68,
      head: [["N°", "N° Étudiant", "Nom", "Prénom", "Groupe"]],
      body: concerned.map((s: any, i: number) => [i + 1, s.student_number, s.last_name, s.first_name, s.group_name]),
      styles: { fontSize: 9 },
    });

    doc.save(`convocation-${ueName.replace(/\s+/g, "-")}-${ex.exam_date}.pdf`);
    toast.success("Convocation PDF exportée");
  };

  return (
    <DashboardLayout title="Examens">
      <Tabs defaultValue="planning" className="space-y-4">
        <TabsList>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="sujets">Suivi des sujets</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Select value={filterSession} onValueChange={setFilterSession}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes sessions</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="rattrapage">Rattrapage</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">{filtered.length} examen(s)</Badge>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => { setEditExamen(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Planifier un examen
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Aucun examen planifié</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UE</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Horaire</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Salle(s)</TableHead>
                      <TableHead>Surveillant(s)</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(ex => {
                      const sujetStatus = getSujetStatus(ex);
                      const cfg = STATUS_CONFIG[sujetStatus];
                      return (
                        <TableRow key={ex.id}>
                          <TableCell className="font-medium">{ex.unites_enseignement?.name || "—"}</TableCell>
                          <TableCell>{format(new Date(ex.exam_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-xs">{ex.start_time?.substring(0, 5)} – {ex.end_time?.substring(0, 5)}</TableCell>
                          <TableCell>
                            <Badge variant={ex.session_type === "rattrapage" ? "secondary" : "outline"} className="text-[10px]">
                              {ex.session_type === "normale" ? "Normale" : "Rattrapage"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {(ex.examen_salles || []).map((s: any) => s.salles?.name).filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {(ex.examen_surveillants || []).map((s: any) => `${s.enseignants?.first_name?.[0]}. ${s.enseignants?.last_name}`).filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant} className="text-[10px]">
                              {sujetStatus === "recu" && <CheckCircle className="h-3 w-3 mr-0.5" />}
                              {sujetStatus === "en_retard" && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                              {sujetStatus === "en_attente" && <Clock className="h-3 w-3 mr-0.5" />}
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportConvocationPDF(ex)} title="Convocation PDF">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ex)}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ex.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
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
        </TabsContent>

        <TabsContent value="sujets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Suivi des dépôts de sujets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm text-center py-4">Chargement...</p>
              ) : examens.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Aucun examen planifié</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UE</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Accès</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Déposé le</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examens.map(ex => {
                      const sujet = ex.examen_sujets?.[0];
                      const status = getSujetStatus(ex);
                      const cfg = STATUS_CONFIG[status];
                      // Check if auto-unlocked (15min after exam end)
                      const isLocked = sujet?.is_locked ?? true;
                      let autoUnlocked = false;
                      if (isLocked && sujet?.file_path) {
                        if (sujet.unlock_at && new Date(sujet.unlock_at) <= new Date()) {
                          autoUnlocked = true;
                        } else {
                          const examStart = new Date(`${ex.exam_date}T${ex.start_time}`);
                          examStart.setMinutes(examStart.getMinutes() - 15);
                          if (new Date() >= examStart) autoUnlocked = true;
                        }
                      }
                      const accessible = !isLocked || autoUnlocked;

                      const handleDownloadSujet = async () => {
                        if (!sujet?.file_path) return;
                        const { data } = await supabase.storage.from("examen-sujets").createSignedUrl(sujet.file_path, 300);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        else toast.error("Impossible de télécharger le fichier");
                      };

                      return (
                        <TableRow key={ex.id}>
                          <TableCell className="font-medium">{ex.unites_enseignement?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {ex.session_type === "normale" ? "Normale" : "Rattrapage"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {sujet?.deadline ? format(new Date(sujet.deadline), "dd/MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {sujet?.file_path ? (
                              <Badge variant={accessible ? "default" : "secondary"} className="text-[10px] gap-1">
                                {accessible ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {accessible ? (autoUnlocked ? "Auto" : "Accessible") : "Verrouillé"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{sujet?.file_name || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {sujet?.deposited_at ? format(new Date(sujet.deposited_at), "dd/MM/yyyy HH:mm") : "—"}
                          </TableCell>
                          <TableCell>
                            {accessible && sujet?.file_path && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownloadSujet} title="Télécharger le sujet">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExamenFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        examen={editExamen}
        departmentId={department?.id || ""}
        ues={ues}
        salles={salles}
        enseignants={enseignants}
        academicYear={academicYear}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
};

export default ExamensPage;
