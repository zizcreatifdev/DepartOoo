import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Perturbation {
  id: string;
  department_id: string;
  type: "greve" | "jour_ferie" | "fermeture_administrative" | "intemperies";
  title: string;
  start_date: string;
  end_date: string;
  affected_levels: string[];
  affected_groups: string[];
  academic_year: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  greve: "Grève",
  jour_ferie: "Jour férié",
  fermeture_administrative: "Fermeture administrative",
  intemperies: "Intempéries",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departmentId: string;
  academicYear: string;
  perturbation: Perturbation | null;
  levels: string[];
  groups: string[];
  onSuccess: (created?: Perturbation) => void;
}

const PerturbationFormDialog: React.FC<Props> = ({
  open, onOpenChange, departmentId, academicYear, perturbation, levels, groups, onSuccess,
}) => {
  const [type, setType] = useState<string>("greve");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (perturbation) {
      setType(perturbation.type);
      setTitle(perturbation.title);
      setStartDate(perturbation.start_date);
      setEndDate(perturbation.end_date);
      setSelectedLevels(perturbation.affected_levels || []);
      setSelectedGroups(perturbation.affected_groups || []);
      setNotes(perturbation.notes || "");
    } else {
      setType("greve");
      setTitle("");
      setStartDate("");
      setEndDate("");
      setSelectedLevels([]);
      setSelectedGroups([]);
      setNotes("");
    }
  }, [perturbation, open]);

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);
  };
  const toggleGroup = (group: string) => {
    setSelectedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
  };

  const handleSubmit = async () => {
    if (!title || !startDate || !endDate) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    if (endDate < startDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setSaving(true);
    const payload = {
      department_id: departmentId,
      type: type as any,
      title,
      start_date: startDate,
      end_date: endDate,
      affected_levels: selectedLevels,
      affected_groups: selectedGroups,
      academic_year: academicYear,
      notes: notes || null,
    };

    let createdPerturbation: Perturbation | undefined;

    if (perturbation) {
      const { error } = await supabase.from("perturbations").update(payload).eq("id", perturbation.id);
      setSaving(false);
      if (error) { toast.error("Erreur: " + error.message); return; }
    } else {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from("perturbations")
        .insert({ ...payload, created_by: userId })
        .select()
        .single();
      setSaving(false);
      if (error) { toast.error("Erreur: " + error.message); return; }
      createdPerturbation = data as Perturbation;
    }

    toast.success(perturbation ? "Perturbation modifiée" : "Perturbation déclarée");
    onOpenChange(false);
    onSuccess(createdPerturbation);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{perturbation ? "Modifier la perturbation" : "Déclarer une perturbation"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Grève nationale du 15 mars" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date début *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Date fin *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          {levels.length > 0 && (
            <div>
              <Label>Niveaux affectés</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {levels.map(l => (
                  <label key={l} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={selectedLevels.includes(l)} onCheckedChange={() => toggleLevel(l)} />
                    {l}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Laissez vide pour affecter tous les niveaux</p>
            </div>
          )}
          {groups.length > 0 && (
            <div>
              <Label>Groupes affectés</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {groups.map(g => (
                  <label key={g} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={selectedGroups.includes(g)} onCheckedChange={() => toggleGroup(g)} />
                    {g}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Laissez vide pour affecter tous les groupes</p>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Détails supplémentaires..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement..." : perturbation ? "Modifier" : "Déclarer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PerturbationFormDialog;
