import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Salle, SalleCreneau } from "@/pages/salles/SallesPage";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Samedi"];
const DAY_INDICES = [0, 1, 2, 3, 4, 6]; // skip Friday (5)
const TIME_SLOTS = [
  { start: "08:00", end: "09:30", label: "08h-09h30" },
  { start: "09:30", end: "11:00", label: "09h30-11h" },
  { start: "11:00", end: "12:30", label: "11h-12h30" },
  { start: "13:00", end: "14:30", label: "13h-14h30" },
  { start: "14:30", end: "16:00", label: "14h30-16h" },
  { start: "16:00", end: "17:30", label: "16h-17h30" },
];

interface Props {
  salles: Salle[];
  creneaux: SalleCreneau[];
  onRefresh: () => void;
}

const SalleAvailabilityGrid = ({ salles, creneaux, onRefresh }: Props) => {
  const [selectedSalleId, setSelectedSalleId] = useState<string>(salles[0]?.id || "");

  const selectedSalle = salles.find((s) => s.id === selectedSalleId);
  const salleCreneaux = creneaux.filter((c) => c.salle_id === selectedSalleId);

  const isOccupied = (dayIndex: number, startTime: string) =>
    salleCreneaux.some((c) => c.day_of_week === dayIndex && c.start_time === startTime + ":00");

  const getCreneau = (dayIndex: number, startTime: string) =>
    salleCreneaux.find((c) => c.day_of_week === dayIndex && c.start_time === startTime + ":00");

  const toggleSlot = async (dayIndex: number, slot: typeof TIME_SLOTS[0]) => {
    const existing = getCreneau(dayIndex, slot.start);
    if (existing) {
      await supabase.from("salle_creneaux").delete().eq("id", existing.id);
      toast.success("Créneau libéré");
    } else {
      const label = prompt("Libellé du créneau (ex: Cours Algo L2)");
      if (label === null) return;
      await supabase.from("salle_creneaux").insert({
        salle_id: selectedSalleId,
        day_of_week: dayIndex,
        start_time: slot.start + ":00",
        end_time: slot.end + ":00",
        label: label || null,
      });
      toast.success("Créneau réservé");
    }
    onRefresh();
  };

  if (salles.length === 0) {
    return <p className="text-muted-foreground text-center py-12">Ajoutez des salles pour voir leur disponibilité.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select value={selectedSalleId} onValueChange={setSelectedSalleId}>
          <SelectTrigger><SelectValue placeholder="Choisir une salle" /></SelectTrigger>
          <SelectContent>
            {salles.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSalle && (
        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium text-muted-foreground">Créneau</th>
                {DAYS.map((day, i) => (
                  <th key={i} className="p-2 text-center font-medium text-muted-foreground">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot.start} className="border-b">
                  <td className="p-2 font-medium text-xs whitespace-nowrap">{slot.label}</td>
                  {DAY_INDICES.map((dayIdx) => {
                    const occupied = isOccupied(dayIdx, slot.start);
                    const creneau = getCreneau(dayIdx, slot.start);
                    return (
                      <td key={dayIdx} className="p-1 text-center">
                        <button
                          onClick={() => toggleSlot(dayIdx, slot)}
                          className={cn(
                            "w-full rounded-md px-2 py-3 text-xs font-medium transition-colors",
                            occupied
                              ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/20"
                              : "bg-green-500/15 text-green-700 hover:bg-green-500/25 border border-green-500/20 dark:text-green-400"
                          )}
                          title={occupied ? creneau?.label || "Occupée" : "Libre"}
                        >
                          {occupied ? (creneau?.label || "Occupée") : "Libre"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalleAvailabilityGrid;
