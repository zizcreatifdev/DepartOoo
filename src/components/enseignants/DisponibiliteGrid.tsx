import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Enseignant } from "@/pages/enseignants/EnseignantsPage";

const DAYS = [
  { label: "Lundi", value: 1 },
  { label: "Mardi", value: 2 },
  { label: "Mercredi", value: 3 },
  { label: "Jeudi", value: 4 },
  { label: "Vendredi", value: 5 },
  { label: "Samedi", value: 6 },
];

const TIME_SLOTS = [
  { key: "matin", label: "Matin" },
  { key: "apres_midi", label: "Après-midi" },
  { key: "soir", label: "Soir" },
];

interface Disponibilite {
  id: string;
  enseignant_id: string;
  day_of_week: number;
  time_slot: string;
  status: "disponible" | "indisponible";
}

interface Props {
  enseignants: Enseignant[];
  /** If provided, locks the grid to this enseignant (self-service mode) */
  fixedEnseignantId?: string;
}

const DisponibiliteGrid = ({ enseignants, fixedEnseignantId }: Props) => {
  const [selectedId, setSelectedId] = useState<string>(fixedEnseignantId || enseignants[0]?.id || "");
  const [dispos, setDispos] = useState<Disponibilite[]>([]);

  const activeEnseignants = enseignants.filter((e) => e.is_active);

  const fetchDispos = async () => {
    if (!selectedId) return;
    const { data } = await supabase
      .from("enseignant_disponibilites")
      .select("*")
      .eq("enseignant_id", selectedId);
    setDispos((data as Disponibilite[]) || []);
  };

  useEffect(() => {
    fetchDispos();
  }, [selectedId]);

  useEffect(() => {
    if (fixedEnseignantId) setSelectedId(fixedEnseignantId);
  }, [fixedEnseignantId]);

  const getStatus = (day: number, slot: string): "disponible" | "indisponible" | null => {
    const d = dispos.find((x) => x.day_of_week === day && x.time_slot === slot);
    return d ? d.status : null;
  };

  const toggleSlot = async (day: number, slot: string) => {
    const existing = dispos.find((x) => x.day_of_week === day && x.time_slot === slot);

    if (!existing) {
      // Create as disponible
      const { error } = await supabase.from("enseignant_disponibilites").insert({
        enseignant_id: selectedId,
        day_of_week: day,
        time_slot: slot,
        status: "disponible",
      });
      if (error) { toast.error("Erreur"); return; }
    } else if (existing.status === "disponible") {
      // Toggle to indisponible
      const { error } = await supabase
        .from("enseignant_disponibilites")
        .update({ status: "indisponible" })
        .eq("id", existing.id);
      if (error) { toast.error("Erreur"); return; }
    } else {
      // Remove (back to non-renseigné)
      const { error } = await supabase
        .from("enseignant_disponibilites")
        .delete()
        .eq("id", existing.id);
      if (error) { toast.error("Erreur"); return; }
    }
    fetchDispos();
  };

  if (activeEnseignants.length === 0 && !fixedEnseignantId) {
    return <p className="text-muted-foreground text-center py-12">Aucun enseignant actif.</p>;
  }

  return (
    <div className="space-y-4">
      {!fixedEnseignantId && (
        <div className="max-w-xs">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Choisir un enseignant" /></SelectTrigger>
            <SelectContent>
              {activeEnseignants.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.last_name} {e.first_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium text-muted-foreground">Créneau</th>
              {DAYS.map((d) => (
                <th key={d.value} className="p-2 text-center font-medium text-muted-foreground">{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot.key} className="border-b">
                <td className="p-2 font-medium text-xs whitespace-nowrap">{slot.label}</td>
                {DAYS.map((day) => {
                  const status = getStatus(day.value, slot.key);
                  return (
                    <td key={day.value} className="p-1 text-center">
                      <button
                        onClick={() => toggleSlot(day.value, slot.key)}
                        className={cn(
                          "w-full rounded-md px-2 py-4 text-xs font-medium transition-colors border",
                          status === "disponible"
                            ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/20 dark:text-green-400"
                            : status === "indisponible"
                            ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted border-border"
                        )}
                        title={
                          status === "disponible" ? "Disponible" : status === "indisponible" ? "Indisponible" : "Non renseigné"
                        }
                      >
                        {status === "disponible" ? "Disponible" : status === "indisponible" ? "Indisponible" : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Cliquez pour alterner : <span className="text-green-600">Disponible</span> → <span className="text-destructive">Indisponible</span> → Non renseigné
      </p>
    </div>
  );
};

export default DisponibiliteGrid;
