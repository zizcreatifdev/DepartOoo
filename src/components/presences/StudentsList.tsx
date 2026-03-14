import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Trash2, Download, UserX, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Student {
  id: string;
  department_id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  group_name: string;
  level: string;
  email: string | null;
  is_active: boolean;
}

interface Props {
  students: Student[];
  allStudents: Student[];
  departmentId: string;
  groups: string[];
  levels: string[];
  isChef: boolean;
  onRefresh: () => void;
}

const StudentsList: React.FC<Props> = ({ students, allStudents, departmentId, groups, levels, isChef, onRefresh }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [group, setGroup] = useState(groups[0] || "Groupe unique");
  const [level, setLevel] = useState(levels[0] || "L1");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [showAbandoned, setShowAbandoned] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!firstName || !lastName || !studentNumber) {
      toast.error("Nom, prénom et numéro étudiant requis");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("students").insert({
      department_id: departmentId,
      first_name: firstName,
      last_name: lastName,
      student_number: studentNumber,
      group_name: group,
      level,
      email: email || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("unique") ? "Ce numéro étudiant existe déjà" : error.message);
      return;
    }
    toast.success("Étudiant ajouté");
    setDialogOpen(false);
    setFirstName(""); setLastName(""); setStudentNumber(""); setEmail("");
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Étudiant supprimé");
    onRefresh();
  };

  const handleAbandon = async (id: string) => {
    const { error } = await supabase.from("students").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Étudiant marqué comme abandonné");
    onRefresh();
  };

  const handleReactivate = async (id: string) => {
    const { error } = await supabase.from("students").update({ is_active: true }).eq("id", id);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Étudiant réactivé");
    onRefresh();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast.error("Fichier vide ou invalide"); return; }

    // Try to detect separator
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));

    const numIdx = headers.findIndex(h => h.includes("numero") || h.includes("number") || h.includes("matricule") || h === "num");
    const nomIdx = headers.findIndex(h => h.includes("nom") || h === "last_name" || h === "lastname");
    const prenomIdx = headers.findIndex(h => h.includes("prenom") || h.includes("prénom") || h === "first_name" || h === "firstname");
    const groupIdx = headers.findIndex(h => h.includes("group") || h.includes("classe"));
    const levelIdx = headers.findIndex(h => h.includes("level") || h.includes("niveau"));
    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));

    if (numIdx === -1 || nomIdx === -1 || prenomIdx === -1) {
      toast.error("Colonnes requises: numéro, nom, prénom. Vérifiez les en-têtes CSV.");
      return;
    }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
      return {
        department_id: departmentId,
        student_number: cols[numIdx] || "",
        last_name: cols[nomIdx] || "",
        first_name: cols[prenomIdx] || "",
        group_name: groupIdx >= 0 ? (cols[groupIdx] || "Groupe unique") : "Groupe unique",
        level: levelIdx >= 0 ? (cols[levelIdx] || levels[0] || "L1") : levels[0] || "L1",
        email: emailIdx >= 0 ? (cols[emailIdx] || null) : null,
      };
    }).filter(r => r.student_number && r.last_name && r.first_name);

    if (rows.length === 0) { toast.error("Aucune ligne valide"); return; }

    const { error } = await supabase.from("students").upsert(rows, { onConflict: "department_id,student_number" });
    if (error) { toast.error("Erreur import: " + error.message); return; }
    toast.success(`${rows.length} étudiants importés`);
    onRefresh();
    if (fileRef.current) fileRef.current.value = "";
  };

  const sourceStudents = showAbandoned ? allStudents.filter(s => !s.is_active) : students;
  const filtered = sourceStudents.filter(s => {
    if (filterGroup !== "all" && s.group_name !== filterGroup) return false;
    if (filterLevel !== "all" && s.level !== filterLevel) return false;
    return true;
  });

  // Group stats
  const groupStats = useMemo(() => {
    const stats: Record<string, { active: number; abandoned: number }> = {};
    allStudents.forEach(s => {
      if (!stats[s.group_name]) stats[s.group_name] = { active: 0, abandoned: 0 };
      if (s.is_active) stats[s.group_name].active++;
      else stats[s.group_name].abandoned++;
    });
    return stats;
  }, [allStudents]);

  const downloadTemplate = () => {
    const csv = "numero;nom;prenom;groupe;niveau;email\n001;Dupont;Jean;Groupe A;L1;jean@example.com";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modele-etudiants.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Groupe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les groupes</SelectItem>
              {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Niveau" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={showAbandoned ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAbandoned(!showAbandoned)}
          >
            <UserX className="h-4 w-4 mr-1" />
            {showAbandoned ? "Voir actifs" : "Voir abandonnés"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Modèle CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importer CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Group stats */}
      {Object.keys(groupStats).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(groupStats).map(([group, stats]) => (
            <div key={group} className="flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 bg-card">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{group}</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-emerald-600">{stats.active} actifs</span>
              {stats.abandoned > 0 && <span className="text-destructive">/ {stats.abandoned} abandon(s)</span>}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Étudiant</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {showAbandoned ? "Aucun étudiant abandonné." : "Aucun étudiant. Importez un fichier CSV ou ajoutez manuellement."}
                </TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{s.student_number}</TableCell>
                  <TableCell className="font-medium">{s.last_name}</TableCell>
                  <TableCell>{s.first_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.group_name}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{s.level}</Badge></TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">Actif</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Abandonné</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.is_active && isChef && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => handleAbandon(s.id)} title="Marquer comme abandonné">
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!s.is_active && isChef && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => handleReactivate(s.id)} title="Réactiver">
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{filtered.length} étudiant(s) affiché(s) — {students.length} actifs, {allStudents.length - students.length} abandonné(s)</p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un étudiant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              <div><Label>Prénom *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
            </div>
            <div><Label>N° Étudiant *</Label><Input value={studentNumber} onChange={e => setStudentNumber(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Groupe</Label>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Niveau</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsList;
