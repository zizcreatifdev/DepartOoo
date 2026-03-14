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
  const [importData, setImportData] = useState<any[] | null>(null);
  const [importUeId, setImportUeId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Import Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    if (rows.length === 0) { toast.error("Fichier vide"); return; }

    // Auto-detect columns
    const headers = Object.keys(rows[0]);
    const numCol = headers.find(h => /numero|matricule|num/i.test(h));
    const noteCol = headers.find(h => /note|score|mark/i.test(h));

    if (!numCol || !noteCol) {
      toast.error("Colonnes 'numéro' et 'note' introuvables dans le fichier");
      return;
    }

    const parsed = rows.map(r => ({
      student_number: String(r[numCol]).trim(),
      note: r[noteCol] !== null && r[noteCol] !== "" ? Number(r[noteCol]) : null,
    })).filter(r => r.student_number);

    setImportData(parsed);
    toast.info(`${parsed.length} lignes détectées. Sélectionnez l'UE puis confirmez.`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!importData || !importUeId || !department) return;

    const inserts = importData.map(row => {
      const student = students.find(s => s.student_number === row.student_number);
      if (!student) return null;
      return {
        department_id: department.id,
        student_id: student.id,
        ue_id: importUeId,
        note: row.note,
        session_type: selectedSession,
        academic_year: academicYear,
        created_by: user?.id || null,
      };
    }).filter(Boolean);

    if (inserts.length === 0) {
      toast.error("Aucun étudiant correspondant trouvé");
      return;
    }

    // Upsert notes
    const { error } = await supabase.from("notes").upsert(inserts as any[], {
      onConflict: "department_id,student_id,ue_id,session_type,academic_year",
    });

    if (error) {
      toast.error("Erreur import: " + error.message);
      return;
    }

    toast.success(`${inserts.length} notes importées`);
    setImportData(null);
    setImportUeId("");
    fetchData();
  };

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
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Importer Excel
                </Button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <Download className="h-4 w-4 mr-1" /> Exporter PDF
                </Button>
              </div>
            )}
          </div>

          {/* Import confirmation */}
          {importData && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {importData.length} lignes détectées — Sélectionnez l'UE cible
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">UE cible</Label>
                    <Select value={importUeId} onValueChange={setImportUeId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner l'UE" /></SelectTrigger>
                      <SelectContent>
                        {filteredUes.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={confirmImport} disabled={!importUeId}>Confirmer l'import</Button>
                  <Button variant="outline" size="sm" onClick={() => setImportData(null)}>Annuler</Button>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs border rounded p-2">
                  {importData.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="font-mono">{r.student_number}</span>
                      <span>{r.note !== null ? r.note : "—"}</span>
                    </div>
                  ))}
                  {importData.length > 10 && <p className="text-muted-foreground mt-1">... et {importData.length - 10} autres</p>}
                </div>
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
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.admis}</p>
                <p className="text-xs text-muted-foreground">Admis</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.compenses}</p>
                <p className="text-xs text-muted-foreground">Compensés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-destructive">{stats.ajournes}</p>
                <p className="text-xs text-muted-foreground">Ajournés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total étudiants</p>
              </CardContent>
            </Card>
          </div>

          {stats.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Taux de réussite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-6 overflow-hidden flex">
                  {stats.admis > 0 && (
                    <div className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ width: `${(stats.admis / stats.total) * 100}%` }}>
                      {Math.round((stats.admis / stats.total) * 100)}%
                    </div>
                  )}
                  {stats.compenses > 0 && (
                    <div className="bg-amber-500 h-full flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ width: `${(stats.compenses / stats.total) * 100}%` }}>
                      {Math.round((stats.compenses / stats.total) * 100)}%
                    </div>
                  )}
                  {stats.ajournes > 0 && (
                    <div className="bg-destructive h-full flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ width: `${(stats.ajournes / stats.total) * 100}%` }}>
                      {Math.round((stats.ajournes / stats.total) * 100)}%
                    </div>
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Admis</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Compensés</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Ajournés</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-1" /> Exporter le relevé PDF
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default NotesPage;
