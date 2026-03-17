import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, parseISO } from "date-fns";

interface UE { id: string; name: string; level: string; }
interface Salle { id: string; name: string; type: string; capacity: number; }
interface Enseignant { id: string; first_name: string; last_name: string; }

interface Examen {
  id: string;
  ue_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  academic_year: string;
  notes: string | null;
  salles: string[];
  surveillants: string[];
  sujet_deadline: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  examen: Examen | null;
  departmentId: string;
  ues: UE[];
  salles: Salle[];
  enseignants: Enseignant[];
  academicYear: string;
  onSuccess: () => void;
}

const ExamenFormDialog: React.FC<Props> = ({
  open, onOpenChange, examen, departmentId, ues, salles, enseignants, academicYear, onSuccess,
}) => {
  const [ueId, setUeId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [sessionType, setSessionType] = useState("normale");
  const [notes, setNotes] = useState("");
  const [selectedSalles, setSelectedSalles] = useState<string[]>([]);
  const [selectedSurveillants, setSelectedSurveillants] = useState<string[]>([]);
  const [sujetDeadline, setSujetDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-calcule la deadline sujet = exam_date - 1 jour
  const computeAutoDeadline = useCallback((date: string): string => {
    if (!date) return "";
    try {
      return format(subDays(parseISO(date), 1), "yyyy-MM-dd");
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (examen) {
      setUeId(examen.ue_id);
      setExamDate(examen.exam_date);
      setStartTime(examen.start_time?.substring(0, 5) || "08:00");
      setEndTime(examen.end_time?.substring(0, 5) || "10:00");
      setSessionType(examen.session_type);
      setNotes(examen.notes || "");
      setSelectedSalles(examen.salles);
      setSelectedSurveillants(examen.surveillants);
      setSujetDeadline(examen.sujet_deadline || "");
    } else {
      setUeId(""); setExamDate(""); setStartTime("08:00"); setEndTime("10:00");
      setSessionType("normale"); setNotes(""); setSelectedSalles([]); setSelectedSurveillants([]);
      setSujetDeadline("");
    }
  }, [examen, open]);

  // Quand la date d'examen change, auto-remplir la deadline si elle est vide (création seulement)
  useEffect(() => {
    if (!examen && examDate && !sujetDeadline) {
      setSujetDeadline(computeAutoDeadline(examDate));
    }
  }, [examDate, examen, sujetDeadline, computeAutoDeadline]);

  const toggleSalle = (id: string) => {
    setSelectedSalles(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const toggleSurveillant = (id: string) => {
    setSelectedSurveillants(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!ueId || !examDate || !startTime || !endTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (selectedSalles.length === 0) {
      toast.error("Sélectionnez au moins une salle");
      return;
    }

    setSaving(true);
    try {
      let examenId: string;
      const payload = {
        department_id: departmentId,
        ue_id: ueId,
        exam_date: examDate,
        start_time: startTime + ":00",
        end_time: endTime + ":00",
        session_type: sessionType,
        academic_year: academicYear,
        notes: notes || null,
      };

      if (examen) {
        examenId = examen.id;
        const { error } = await supabase.from("examens").update(payload).eq("id", examenId);
        if (error) throw error;
        // Delete old associations
        await supabase.from("examen_salles").delete().eq("examen_id", examenId);
        await supabase.from("examen_surveillants").delete().eq("examen_id", examenId);
      } else {
        const { data, error } = await supabase.from("examens").insert(payload).select("id").single();
        if (error) throw error;
        examenId = data.id;
      }

      // Insert salles
      if (selectedSalles.length > 0) {
        const { error } = await supabase.from("examen_salles").insert(
          selectedSalles.map(s => ({ examen_id: examenId, salle_id: s }))
        );
        if (error) throw error;
      }

      // Insert surveillants
      if (selectedSurveillants.length > 0) {
        const { error } = await supabase.from("examen_surveillants").insert(
          selectedSurveillants.map(s => ({ examen_id: examenId, enseignant_id: s }))
        );
        if (error) throw error;
      }

      // Créer l'entrée sujet lors d'un nouvel examen
      // deadline = date saisie ou exam_date - 1 jour en fallback
      if (!examen) {
        const computedDeadline = sujetDeadline || computeAutoDeadline(examDate);
        await supabase.from("examen_sujets").insert({
          examen_id: examenId,
          deadline: computedDeadline || null,
          status: "en_attente",
        });
      }

      toast.success(examen ? "Examen modifié" : "Examen planifié");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{examen ? "Modifier l'examen" : "Planifier un examen"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Unité d'enseignement *</Label>
            <Select value={ueId} onValueChange={setUeId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une UE" /></SelectTrigger>
              <SelectContent>
                {ues.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.level})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Session *</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="rattrapage">Rattrapage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Date d'examen *</Label>
            <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Début *</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fin *</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Salles * (cochez les salles à utiliser)</Label>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1.5">
              {salles.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox checked={selectedSalles.includes(s.id)} onCheckedChange={() => toggleSalle(s.id)} />
                  <span className="text-sm">{s.name} ({s.type}, {s.capacity} places)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Surveillants (optionnel)</Label>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1.5">
              {enseignants.map(e => (
                <div key={e.id} className="flex items-center gap-2">
                  <Checkbox checked={selectedSurveillants.includes(e.id)} onCheckedChange={() => toggleSurveillant(e.id)} />
                  <span className="text-sm">{e.first_name} {e.last_name}</span>
                </div>
              ))}
            </div>
          </div>

          {!examen && (
            <div className="space-y-1">
              <Label>Deadline dépôt sujet</Label>
              <Input type="date" value={sujetDeadline} onChange={e => setSujetDeadline(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input placeholder="Notes optionnelles..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "..." : examen ? "Modifier" : "Planifier"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamenFormDialog;
