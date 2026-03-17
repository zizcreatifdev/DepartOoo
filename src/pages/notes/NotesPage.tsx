import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Upload, Download, CheckCircle, XCircle, MinusCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ImportWizard from "@/components/notes/ImportWizard";
import ResultatsPromotion from "@/components/notes/ResultatsPromotion";
import ReglesCalculForm from "@/components/notes/ReglesCalculForm";
import { calculerResultatsPromotion, type ResultatsPromotion as IResultatsPromotion } from "@/engine/calcul-notes.engine";
import { Calculator, Loader2 as Spinner } from "lucide-react";

const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
};

interface NoteRow {
  student_id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  group_name: string;
  notes: Record<string, number | null>; // ue_id -> note
}

const NotesPage = () => {
  const { department, role, user } = useAuth();
  const canEdit = role === "chef" || role === "assistant";
  const academicYear = getCurrentAcademicYear();

  const [ues, setUes] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [existingNotes, setExistingNotes] = useState<any[]>([]);
  const [config, setConfig] = useState({ passing_grade: 10, compensation_enabled: true, compensation_threshold: 8 });
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<string>("normale");
  const [levels, setLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // États calcul de résultats
  const [resultatsData, setResultatsData] = useState<IResultatsPromotion | null>(null);
  const [calculatingResultats, setCalculatingResultats] = useState(false);
  const [selectedMaquetteId, setSelectedMaquetteId] = useState<string>("");

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);

    const [ueRes, studRes, notesRes, configRes, levelsRes] = await Promise.all([
      supabase.from("unites_enseignement")
        .select("id, name, coefficient, credits_ects, maquettes!inner(department_id, level, semestre)")
        .eq("maquettes.department_id", department.id),
      supabase.from("students").select("*").eq("department_id", department.id).eq("is_active", true).order("last_name"),
      supabase.from("notes").select("*").eq("department_id", department.id).eq("academic_year", academicYear),
      supabase.from("notes_config").select("*").eq("department_id", department.id).maybeSingle(),
      supabase.from("department_levels").select("level").eq("department_id", department.id),
    ]);

    setUes((ueRes.data || []).map((u: any) => ({ ...u, level: u.maquettes?.level, semestre: u.maquettes?.semestre })));
    setStudents(studRes.data || []);
    setExistingNotes(notesRes.data || []);
    if (configRes.data) {
      setConfig({
        passing_grade: configRes.data.passing_grade,
        compensation_enabled: configRes.data.compensation_enabled,
        compensation_threshold: configRes.data.compensation_threshold,
      });
    }
    setLevels((levelsRes.data || []).map((l: any) => l.level));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [department]);

  // Filter UEs by level
  const filteredUes = selectedLevel === "all" ? ues : ues.filter(u => u.level === selectedLevel);

  // Filter notes by session
  const sessionNotes = existingNotes.filter(n => n.session_type === selectedSession);

  // Build note rows
  const noteRows: NoteRow[] = useMemo(() => {
    const levelStudents = selectedLevel === "all" ? students : students.filter(s => s.level === selectedLevel);
    return levelStudents.map(s => {
      const studentNotes: Record<string, number | null> = {};
      filteredUes.forEach(ue => {
        const found = sessionNotes.find(n => n.student_id === s.id && n.ue_id === ue.id);
        studentNotes[ue.id] = found?.note ?? null;
      });
      return {
        student_id: s.id,
        student_number: s.student_number,
        first_name: s.first_name,
        last_name: s.last_name,
        group_name: s.group_name,
        notes: studentNotes,
      };
    });
  }, [students, filteredUes, sessionNotes, selectedLevel]);

  // Calculate averages
  const getAverage = (row: NoteRow) => {
    let totalWeighted = 0;
    let totalCoeff = 0;
    filteredUes.forEach(ue => {
      const note = row.notes[ue.id];
      if (note !== null && note !== undefined) {
        totalWeighted += note * (ue.coefficient || 1);
        totalCoeff += (ue.coefficient || 1);
      }
    });
    return totalCoeff > 0 ? totalWeighted / totalCoeff : null;
  };

  const getVerdict = (avg: number | null): { label: string; variant: "default" | "destructive" | "secondary" } => {
    if (avg === null) return { label: "—", variant: "secondary" };
    if (avg >= config.passing_grade) return { label: "Admis", variant: "default" };
    if (config.compensation_enabled && avg >= config.compensation_threshold) return { label: "Compensé", variant: "secondary" };
    return { label: "Ajourné", variant: "destructive" };
  };

  // Import wizard callbacks (ancien code supprimé, remplacé par ImportWizard)


  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Relevé de notes", 14, 20);
    doc.setFontSize(10);
    doc.text(`Année : ${academicYear} | Session : ${selectedSession} | Niveau : ${selectedLevel === "all" ? "Tous" : selectedLevel}`, 14, 28);

    const headers = ["N°", "Nom", "Prénom", ...filteredUes.map(u => u.name), "Moyenne", "Résultat"];
    const body = noteRows.map((row, i) => {
      const avg = getAverage(row);
      const verdict = getVerdict(avg);
      return [
        i + 1,
        row.last_name,
        row.first_name,
        ...filteredUes.map(u => row.notes[u.id] !== null ? String(row.notes[u.id]) : "—"),
        avg !== null ? avg.toFixed(2) : "—",
        verdict.label,
      ];
    });

    autoTable(doc, { startY: 35, head: [headers], body, styles: { fontSize: 7 } });
    doc.save(`releve-notes-${selectedLevel}-${selectedSession}-${academicYear}.pdf`);
    toast.success("PDF exporté");
  };

  // Stats
  const stats = useMemo(() => {
    let admis = 0, ajournes = 0, compenses = 0, sansNote = 0;
    noteRows.forEach(row => {
      const avg = getAverage(row);
      const v = getVerdict(avg);
      if (v.label === "Admis") admis++;
      else if (v.label === "Ajourné") ajournes++;
      else if (v.label === "Compensé") compenses++;
      else sansNote++;
    });
    return { admis, ajournes, compenses, sansNote, total: noteRows.length };
  }, [noteRows, filteredUes, config]);

  return (
    <DashboardLayout title="Notes">
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notes">Saisie & Consultation</TabsTrigger>
          <TabsTrigger value="resultats">Résultats</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4">
          {/* Filters & actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Niveau" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="rattrapage">Rattrapage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowImportWizard(v => !v)}>
                  <Upload className="h-4 w-4 mr-1" />
                  {showImportWizard ? "Fermer l'import" : "Importer Excel"}
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <Download className="h-4 w-4 mr-1" /> Exporter PDF
                </Button>
              </div>
            )}
          </div>

          {/* Import Wizard */}
          {showImportWizard && department && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Import intelligent de notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImportWizard
                  ues={filteredUes.map(u => ({ id: u.id, name: u.name }))}
                  students={students.map(s => ({
                    id: s.id,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    student_number: s.student_number,
                  }))}
                  departmentId={department.id}
                  academicYear={academicYear}
                  sessionType={selectedSession}
                  onSuccess={() => { setShowImportWizard(false); fetchData(); }}
                />
              </CardContent>
            </Card>
          )}

          {/* Notes table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
              ) : noteRows.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Aucun étudiant actif pour ce niveau</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Étudiant</TableHead>
                      <TableHead>Groupe</TableHead>
                      {filteredUes.map(u => (
                        <TableHead key={u.id} className="text-center text-xs">
                          {u.name}<br /><span className="text-muted-foreground font-normal">coeff {u.coefficient}</span>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-bold">Moy.</TableHead>
                      <TableHead className="text-center">Résultat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {noteRows.map(row => {
                      const avg = getAverage(row);
                      const verdict = getVerdict(avg);
                      return (
                        <TableRow key={row.student_id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium whitespace-nowrap">
                            {row.last_name} {row.first_name}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{row.group_name}</Badge></TableCell>
                          {filteredUes.map(u => (
                            <TableCell key={u.id} className="text-center text-sm">
                              {row.notes[u.id] !== null ? (
                                <span className={row.notes[u.id]! < config.passing_grade ? "text-destructive font-medium" : ""}>
                                  {row.notes[u.id]}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold">
                            {avg !== null ? (
                              <span className={avg < config.passing_grade ? "text-destructive" : "text-emerald-600"}>
                                {avg.toFixed(2)}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={verdict.variant} className="text-[10px]">
                              {verdict.label === "Admis" && <CheckCircle className="h-3 w-3 mr-0.5" />}
                              {verdict.label === "Ajourné" && <XCircle className="h-3 w-3 mr-0.5" />}
                              {verdict.label === "Compensé" && <MinusCircle className="h-3 w-3 mr-0.5" />}
                              {verdict.label}
                            </Badge>
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

        <TabsContent value="resultats" className="space-y-4">
          {/* Règles de calcul (chef uniquement) */}
          {role === "chef" && department && (
            <ReglesCalculForm
              departmentId={department.id}
              config={config}
              onSaved={updated => setConfig(updated)}
            />
          )}

          {/* Sélecteur maquette + bouton calcul */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-xs">Maquette (UE groupées)</Label>
                  <Select value={selectedMaquetteId} onValueChange={setSelectedMaquetteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une maquette" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Map(ues.map(u => [u.maquette_id, u])).values()].map(u => (
                        <SelectItem key={u.maquette_id} value={u.maquette_id}>
                          {u.level} – {u.semestre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-[140px]">
                  <Label className="text-xs">Session</Label>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="rattrapage">Rattrapage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={!selectedMaquetteId || calculatingResultats || !department}
                  onClick={async () => {
                    if (!selectedMaquetteId || !department) return;
                    setCalculatingResultats(true);
                    try {
                      const res = await calculerResultatsPromotion(
                        department.id,
                        selectedMaquetteId,
                        selectedSession,
                        academicYear,
                      );
                      setResultatsData(res);
                    } catch (err) {
                      toast.error("Erreur calcul : " + (err instanceof Error ? err.message : String(err)));
                    } finally {
                      setCalculatingResultats(false);
                    }
                  }}
                >
                  {calculatingResultats
                    ? <><Spinner className="h-4 w-4 animate-spin mr-2" />Calcul…</>
                    : <><Calculator className="h-4 w-4 mr-2" />Calculer les résultats</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Résultats calculés */}
          {resultatsData && (
            <ResultatsPromotion
              resultats={resultatsData}
              sessionLabel={selectedSession === "normale" ? "Session normale" : "Session de rattrapage"}
            />
          )}

          {/* Export PDF (inchangé) */}
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-1" /> Exporter le relevé PDF
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default NotesPage;
