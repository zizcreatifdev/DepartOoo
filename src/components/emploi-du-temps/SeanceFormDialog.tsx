import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Seance, UeInfo, EnseignantInfo, SalleInfo, EffectifInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";
import { verifierConflitsSeance, type Conflit } from "@/engine/conflits.engine";

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

const DEBOUNCE_MS = 600;

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

  // --- État des conflits (moteur) ---
  const [conflits, setConflits] = useState<Conflit[]>([]);
  const [peutSauvegarder, setPeutSauvegarder] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset à l'ouverture / changement de séance
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
    setConflits([]);
    setPeutSauvegarder(true);
    setVerifying(false);
  }, [seance, open]);

  // --- Déclenchement de la vérification avec debounce ---
  const runVerification = useCallback(() => {
    const slot = TIME_OPTIONS[Number(timeSlot)];
    if (!seanceDate || !enseignantId || !ueId || !slot) {
      setConflits([]);
      setPeutSauvegarder(true);
      setVerifying(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setVerifying(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await verifierConflitsSeance({
          seance_date: seanceDate,
          start_time: slot.start + ":00",
          end_time: slot.end + ":00",
          salle_id: isOnline ? null : (salleId || null),
          enseignant_id: enseignantId,
          group_name: groupName,
          ue_id: ueId,
          department_id: departmentId,
          type_seance: type,
          seance_id_exclu: seance?.id,
        });
        setConflits(result.conflits);
        setPeutSauvegarder(result.peutSauvegarder);
      } catch (err) {
        console.error("Erreur vérification conflits:", err);
        // Bloquer la sauvegarde si la vérification échoue : état inconnu
        setPeutSauvegarder(false);
        setConflits([{
          bloquant: true,
          type: "erreur_verification" as any,
          message: "Impossible de vérifier les conflits (erreur réseau). Réessayez avant de sauvegarder.",
        }]);
      } finally {
        setVerifying(false);
      }
    }, DEBOUNCE_MS);
  }, [seanceDate, enseignantId, ueId, timeSlot, isOnline, salleId, groupName, departmentId, type, seance]);

  // Déclencher la vérification à chaque changement de champ clé
  useEffect(() => {
    runVerification();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [runVerification]);

  const handleSave = async () => {
    if (!ueId || !enseignantId || !seanceDate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!isOnline && !salleId) {
      toast.error("Sélectionnez une salle ou choisissez le mode en ligne");
      return;
    }
    if (!peutSauvegarder) {
      toast.error("Résolvez les conflits bloquants avant de sauvegarder");
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

  // Séparer conflits bloquants et avertissements
  const conflitsBloquants = conflits.filter(c => c.bloquant);
  const conflitsWarnings = conflits.filter(c => !c.bloquant);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{seance ? "Modifier la séance" : "Nouvelle séance"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

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

          {/* --- Zone conflits --- */}
          {verifying && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification des conflits…
            </div>
          )}

          {!verifying && conflitsBloquants.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Conflits bloquants :</p>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  {conflitsBloquants.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {!verifying && conflitsWarnings.length > 0 && (
            <Alert className="border-orange-400 bg-orange-50 text-orange-800">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <AlertDescription>
                <p className="font-medium mb-1">Avertissements :</p>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  {conflitsWarnings.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving || verifying || !peutSauvegarder}
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</>
                : seance ? "Modifier" : "Ajouter"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeanceFormDialog;
