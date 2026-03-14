import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Seance, UeInfo, EnseignantInfo, SalleInfo, EffectifInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seance: Seance | null;
  departmentId: string;
  ues: UeInfo[];
  enseignants: EnseignantInfo[];
  salles: SalleInfo[];
  effectifs: EffectifInfo[];
  existingSeances: Seance[];
  onSuccess: () => void;
}

const TIME_OPTIONS = [
  { label: "08:00 – 09:30", start: "08:00", end: "09:30" },
  { label: "09:45 – 11:15", start: "09:45", end: "11:15" },
  { label: "11:30 – 13:00", start: "11:30", end: "13:00" },
  { label: "14:00 – 15:30", start: "14:00", end: "15:30" },
  { label: "15:45 – 17:15", start: "15:45", end: "17:15" },
  { label: "17:30 – 19:00", start: "17:30", end: "19:00" },
];

const SeanceFormDialog: React.FC<Props> = ({
  open, onOpenChange, seance, departmentId, ues, enseignants, salles, effectifs, existingSeances, onSuccess,
}) => {
  const [ueId, setUeId] = useState("");
  const [type, setType] = useState<"CM" | "TD" | "TP">("CM");
  const [enseignantId, setEnseignantId] = useState("");
  const [salleId, setSalleId] = useState("");
  const [groupName, setGroupName] = useState("Groupe unique");
  const [seanceDate, setSeanceDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("0");
  const [isOnline, setIsOnline] = useState(false);
  const [onlineLink, setOnlineLink] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (seance) {
      setUeId(seance.ue_id);
      setType(seance.type);
      setEnseignantId(seance.enseignant_id);
      setSalleId(seance.salle_id || "");
      setGroupName(seance.group_name);
      setSeanceDate(seance.seance_date);
      setIsOnline(seance.is_online);
      setOnlineLink(seance.online_link || "");
      setNotes(seance.notes || "");
      const slotIdx = TIME_OPTIONS.findIndex(t => t.start === seance.start_time?.substring(0, 5));
      setTimeSlot(slotIdx >= 0 ? String(slotIdx) : "0");
    } else {
      setUeId("");
      setType("CM");
      setEnseignantId("");
      setSalleId("");
      setGroupName("Groupe unique");
      setSeanceDate("");
      setTimeSlot("0");
      setIsOnline(false);
      setOnlineLink("");
      setNotes("");
    }
    setConflicts([]);
  }, [seance, open]);

  // Conflict detection
  const detectConflicts = useMemo(() => {
    if (!seanceDate || !enseignantId) return [];
    const slot = TIME_OPTIONS[Number(timeSlot)];
    if (!slot) return [];

    const errors: string[] = [];
    const otherSeances = existingSeances.filter(s => s.id !== seance?.id && s.seance_date === seanceDate && s.start_time?.substring(0, 5) === slot.start);

    // Salle conflict
    if (!isOnline && salleId) {
      const salleConflict = otherSeances.find(s => s.salle_id === salleId);
      if (salleConflict) {
        const salle = salles.find(s => s.id === salleId);
        errors.push(`Cette salle (${salle?.name}) est déjà occupée sur ce créneau`);
      }
    }

    // Enseignant conflict (check disponibilités too)
    const ensConflict = otherSeances.find(s => s.enseignant_id === enseignantId);
    if (ensConflict) {
      const ens = enseignants.find(e => e.id === enseignantId);
      errors.push(`Cet enseignant (${ens?.first_name} ${ens?.last_name}) a déjà un cours sur ce créneau`);
    }

    // Capacity check
    if (!isOnline && salleId && groupName) {
      const salle = salles.find(s => s.id === salleId);
      const group = effectifs.find(e => e.group_name === groupName);
      if (salle && group && group.student_count > salle.capacity) {
        errors.push(`La salle est trop petite pour l'effectif de ce groupe (${group.student_count} étudiants, capacité ${salle.capacity})`);
      }
    }

    // Group conflict
    const groupConflict = otherSeances.find(s => s.group_name === groupName);
    if (groupConflict) {
      errors.push(`Ce groupe (${groupName}) a déjà un cours sur ce créneau`);
    }

    return errors;
  }, [seanceDate, enseignantId, salleId, groupName, isOnline, timeSlot, existingSeances, seance, salles, effectifs, enseignants]);

  useEffect(() => {
    setConflicts(detectConflicts);
  }, [detectConflicts]);

  const handleSave = async () => {
    console.log("handleSave called", { ueId, enseignantId, seanceDate, salleId, isOnline, conflicts });
    if (!ueId || !enseignantId || !seanceDate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!isOnline && !salleId) {
      toast.error("Sélectionnez une salle ou choisissez le mode en ligne");
      return;
    }
    if (conflicts.length > 0) {
      toast.error("Résolvez les conflits avant de sauvegarder");
      return;
    }

    setSaving(true);
    const slot = TIME_OPTIONS[Number(timeSlot)];
    const payload = {
      department_id: departmentId,
      ue_id: ueId,
      type,
      enseignant_id: enseignantId,
      salle_id: isOnline ? null : (salleId || null),
      group_name: groupName,
      seance_date: seanceDate,
      start_time: slot.start + ":00",
      end_time: slot.end + ":00",
      is_online: isOnline,
      online_link: isOnline ? onlineLink : null,
      notes: notes || null,
    };

    console.log("Saving seance payload:", payload);

    let error;
    if (seance) {
      ({ error } = await supabase.from("seances").update(payload).eq("id", seance.id));
    } else {
      ({ error } = await supabase.from("seances").insert(payload));
    }

    setSaving(false);
    if (error) {
      console.error("Seance save error:", error);
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(seance ? "Séance modifiée" : "Séance ajoutée");
    onOpenChange(false);
    onSuccess();
  };

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    groups.add("Groupe unique");
    effectifs.forEach(e => groups.add(e.group_name));
    existingSeances.forEach(s => groups.add(s.group_name));
    return Array.from(groups).sort();
  }, [effectifs, existingSeances]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{seance ? "Modifier la séance" : "Nouvelle séance"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflicts */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* UE */}
          <div className="space-y-1">
            <Label>Unité d'enseignement *</Label>
            <Select value={ueId} onValueChange={setUeId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une UE" /></SelectTrigger>
              <SelectContent>
                {ues.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label>Type de cours *</Label>
            <Select value={type} onValueChange={v => setType(v as "CM" | "TD" | "TP")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CM">CM (Cours Magistral)</SelectItem>
                <SelectItem value="TD">TD (Travaux Dirigés)</SelectItem>
                <SelectItem value="TP">TP (Travaux Pratiques)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enseignant */}
          <div className="space-y-1">
            <Label>Enseignant *</Label>
            <Select value={enseignantId} onValueChange={setEnseignantId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {enseignants.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Online toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isOnline} onCheckedChange={setIsOnline} />
            <Label>Cours en ligne</Label>
          </div>

          {isOnline ? (
            <div className="space-y-1">
              <Label>Lien de la visioconférence</Label>
              <Input placeholder="https://meet.google.com/..." value={onlineLink} onChange={e => setOnlineLink(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Salle *</Label>
              <Select value={salleId} onValueChange={setSalleId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une salle" /></SelectTrigger>
                <SelectContent>
                  {salles.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.type}, {s.capacity} places)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Group */}
          <div className="space-y-1">
            <Label>Groupe *</Label>
            <Select value={groupName} onValueChange={setGroupName}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {uniqueGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Date *</Label>
            <Input type="date" value={seanceDate} onChange={e => setSeanceDate(e.target.value)} />
          </div>

          {/* Time slot */}
          <div className="space-y-1">
            <Label>Créneau horaire *</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t, i) => (
                  <SelectItem key={i} value={String(i)}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input placeholder="Notes optionnelles..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || conflicts.length > 0}>
              {saving ? "Enregistrement..." : seance ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeanceFormDialog;
