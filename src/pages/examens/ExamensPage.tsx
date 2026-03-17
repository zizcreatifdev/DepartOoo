import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Plus, Edit2, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ExamenFormDialog from "@/components/examens/ExamenFormDialog";
import ListeConvocationDialog from "@/components/examens/ListeConvocationDialog";
import SujetsTracker from "@/components/examens/SujetsTracker";
import { checkSujetsEnRetard } from "@/engine/examens.engine";

const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
};


const ExamensPage = () => {
  const { department, role } = useAuth();
  const canEdit = role === "chef" || role === "assistant";
  const academicYear = getCurrentAcademicYear();

  const [examens, setExamens] = useState<any[]>([]);
  const [ues, setUes] = useState<any[]>([]);
  const [salles, setSalles] = useState<any[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExamen, setEditExamen] = useState<any>(null);
  const [filterSession, setFilterSession] = useState<string>("all");
  const [convocationExamen, setConvocationExamen] = useState<any>(null);

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);

    const [exRes, ueRes, salleRes, ensRes] = await Promise.all([
      supabase.from("examens").select(`
        *,
        unites_enseignement(name, maquette_id, maquettes(level, semestre)),
        examen_salles(salle_id, salles(name, type, capacity)),
        examen_surveillants(enseignant_id, enseignants(first_name, last_name, phone)),
        examen_sujets(*)
      `).eq("department_id", department.id).eq("academic_year", academicYear).order("exam_date"),
      supabase.from("unites_enseignement")
        .select("id, name, maquettes!inner(department_id, level)")
        .eq("maquettes.department_id", department.id),
      supabase.from("salles").select("id, name, type, capacity").eq("department_id", department.id),
      supabase.from("enseignants").select("id, first_name, last_name").eq("department_id", department.id).eq("is_active", true),
    ]);

    setExamens(exRes.data || []);
    setUes((ueRes.data || []).map((u: any) => ({ id: u.id, name: u.name, level: u.maquettes?.level || "" })));
    setSalles(salleRes.data || []);
    setEnseignants(ensRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (department?.id) {
      // Vérifier les sujets en retard en arrière-plan (non-bloquant)
      checkSujetsEnRetard(department.id).catch(console.error);
    }
  }, [department]);

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

  const getSujetStatus = (ex: any): "recu" | "en_retard" | "en_attente" => {
    const sujet = ex.examen_sujets?.[0];
    if (!sujet) return "en_attente";
    if (sujet.file_path) return "recu";
    if (sujet.deadline && new Date(sujet.deadline) < new Date()) return "en_retard";
    return "en_attente";
  };

  const filtered = filterSession === "all" ? examens : examens.filter(e => e.session_type === filterSession);

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
                      const sujetBadge = {
                        recu:       { label: "Reçu",       variant: "default" as const },
                        en_attente: { label: "En attente", variant: "secondary" as const },
                        en_retard:  { label: "En retard",  variant: "destructive" as const },
                      }[sujetStatus];
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
                            <Badge variant={sujetBadge.variant} className="text-[10px]">
                              {sujetBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {/* Convocation filtrée */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setConvocationExamen(ex)}
                                title="Liste de convocation"
                              >
                                <Users className="h-3.5 w-3.5" />
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
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
              ) : (
                <SujetsTracker
                  examens={examens}
                  canEdit={canEdit}
                  departmentId={department?.id || ""}
                  academicYear={academicYear}
                  onRefresh={fetchData}
                />
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

      {convocationExamen && (
        <ListeConvocationDialog
          open={!!convocationExamen}
          onOpenChange={open => { if (!open) setConvocationExamen(null); }}
          examen={convocationExamen}
          departmentId={department?.id || ""}
          academicYear={academicYear}
        />
      )}
    </DashboardLayout>
  );
};

export default ExamensPage;
