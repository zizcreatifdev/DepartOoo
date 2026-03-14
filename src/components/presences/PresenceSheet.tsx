import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Link2, Copy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Student } from "./StudentsList";

interface Seance {
  id: string;
  ue_id: string;
  type: string;
  group_name: string;
  seance_date: string;
  start_time: string;
  end_time: string;
  enseignant_id: string;
}

interface UeInfo {
  id: string;
  name: string;
}

interface EnseignantInfo {
  id: string;
  first_name: string;
  last_name: string;
}

interface Presence {
  id: string;
  seance_id: string;
  student_id: string;
  status: "present" | "absent_justifie" | "absent_non_justifie";
  notes: string | null;
}

interface AbsenceSettings {
  threshold_cm: number;
  threshold_td: number;
  threshold_tp: number;
}

interface Props {
  departmentId: string;
  students: Student[];
  seances: Seance[];
  ues: UeInfo[];
  enseignants: EnseignantInfo[];
  allPresences: Presence[];
  absenceSettings: AbsenceSettings;
  perturbations: any[];
  canEdit: boolean;
  onRefresh: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  present: "Présent",
  absent_justifie: "Absent (J)",
  absent_non_justifie: "Absent (NJ)",
};

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-800",
  absent_justifie: "bg-amber-100 text-amber-800",
  absent_non_justifie: "bg-red-100 text-red-800",
};

const PresenceSheet: React.FC<Props> = ({
  departmentId, students, seances, ues, enseignants, allPresences, absenceSettings, perturbations, canEdit, onRefresh,
}) => {
  const [selectedSeance, setSelectedSeance] = useState<string>("");
  const [presences, setPresences] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const ueMap = useMemo(() => new Map(ues.map(u => [u.id, u])), [ues]);
  const ensMap = useMemo(() => new Map(enseignants.map(e => [e.id, e])), [enseignants]);

  // Filter out cancelled seances (perturbation)
  const { isSeanceCancelled } = useMemo(() => {
    const fn = (s: Seance) => {
      return perturbations.some((p: any) => {
        if (s.seance_date < p.start_date || s.seance_date > p.end_date) return false;
        if (p.affected_groups?.length > 0 && !p.affected_groups.includes(s.group_name)) return false;
        return true;
      });
    };
    return { isSeanceCancelled: fn };
  }, [perturbations]);

  const validSeances = useMemo(() => seances.filter(s => !isSeanceCancelled(s)), [seances, isSeanceCancelled]);

  const seance = validSeances.find(s => s.id === selectedSeance);
  const seanceStudents = useMemo(() => {
    if (!seance) return [];
    return students.filter(s => s.group_name === seance.group_name && s.is_active);
  }, [seance, students]);

  // Load existing presences when seance changes
  useEffect(() => {
    if (!selectedSeance) return;
    const existing = allPresences.filter(p => p.seance_id === selectedSeance);
    const map: Record<string, string> = {};
    existing.forEach(p => { map[p.student_id] = p.status; });
    setPresences(map);
  }, [selectedSeance, allPresences]);

  // Compute absence counts per student per UE
  const getAbsenceCount = (studentId: string, ueId: string, type: string) => {
    const ueSeances = seances.filter(s => s.ue_id === ueId && s.type === type && !isSeanceCancelled(s));
    return allPresences.filter(p =>
      p.student_id === studentId &&
      p.status === "absent_non_justifie" &&
      ueSeances.some(s => s.id === p.seance_id)
    ).length;
  };

  const getThreshold = (type: string) => {
    if (type === "CM") return absenceSettings.threshold_cm;
    if (type === "TD") return absenceSettings.threshold_td;
    return absenceSettings.threshold_tp;
  };

  const toggleStatus = (studentId: string) => {
    const current = presences[studentId] || "present";
    const order = ["present", "absent_non_justifie", "absent_justifie"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setPresences(prev => ({ ...prev, [studentId]: next }));
  };

  const handleSave = async () => {
    if (!selectedSeance) return;
    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const rows = seanceStudents.map(s => ({
      seance_id: selectedSeance,
      student_id: s.id,
      status: (presences[s.id] || "present") as any,
      marked_by: userId,
    }));

    const { error } = await supabase.from("presences").upsert(rows, { onConflict: "seance_id,student_id" });
    setSaving(false);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Présences enregistrées");
    onRefresh();
  };

  const handleGenerateLink = async () => {
    if (!selectedSeance) return;
    setGeneratingLink(true);
    const { data, error } = await supabase.from("presence_links").insert({ seance_id: selectedSeance }).select("token").single();
    setGeneratingLink(false);
    if (error) { toast.error("Erreur: " + error.message); return; }
    const link = `${window.location.origin}/presences/${data.token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papier !");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedSeance} onValueChange={setSelectedSeance}>
          <SelectTrigger className="w-[400px]"><SelectValue placeholder="Sélectionner une séance..." /></SelectTrigger>
          <SelectContent>
            {validSeances.length === 0 && <SelectItem value="_none" disabled>Aucune séance disponible</SelectItem>}
            {validSeances.map(s => {
              const ue = ueMap.get(s.ue_id);
              const ens = ensMap.get(s.enseignant_id);
              return (
                <SelectItem key={s.id} value={s.id}>
                  {format(new Date(s.seance_date), "d MMM", { locale: fr })} — {ue?.name || "UE"} ({s.type}) — {s.group_name} — {ens ? `${ens.first_name} ${ens.last_name}` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {selectedSeance && canEdit && (
          <>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "..." : "Enregistrer"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateLink} disabled={generatingLink}>
              <Link2 className="h-4 w-4 mr-1" /> Lien partageable
            </Button>
          </>
        )}
      </div>

      {seance && seanceStudents.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-center">Absences NJ ({seance.type})</TableHead>
                  <TableHead className="text-center">Alerte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seanceStudents.map(s => {
                  const status = presences[s.id] || "present";
                  const absCount = getAbsenceCount(s.id, seance.ue_id, seance.type);
                  const threshold = getThreshold(seance.type);
                  const isNearExclusion = absCount >= threshold - 1 && absCount < threshold;
                  const isExcluded = absCount >= threshold;

                  return (
                    <TableRow key={s.id} className={isExcluded ? "bg-red-50 opacity-70" : ""}>
                      <TableCell className="font-mono text-xs">{s.student_number}</TableCell>
                      <TableCell className="font-medium">{s.last_name}</TableCell>
                      <TableCell>{s.first_name}</TableCell>
                      <TableCell className="text-center">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`text-xs h-7 ${STATUS_COLORS[status]}`}
                            onClick={() => toggleStatus(s.id)}
                          >
                            {status === "present" ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                            {STATUS_LABELS[status]}
                          </Button>
                        ) : (
                          <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${absCount >= threshold ? "text-destructive" : absCount >= threshold - 1 ? "text-amber-600" : ""}`}>
                          {absCount}/{threshold}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isExcluded && (
                          <Badge variant="destructive" className="text-[10px]">EXCLU</Badge>
                        )}
                        {isNearExclusion && !isExcluded && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> Proche seuil
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {seance && seanceStudents.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun étudiant dans le groupe "{seance.group_name}". Importez des étudiants d'abord.
          </CardContent>
        </Card>
      )}

      {!selectedSeance && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Sélectionnez une séance pour gérer les présences.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PresenceSheet;
