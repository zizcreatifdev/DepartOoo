import { useMemo } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Video, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Seance, UeInfo, EnseignantInfo, SalleInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";
import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";
import { isSeanceCancelled } from "@/lib/perturbationUtils";

const TIME_SLOTS = [
  { label: "08:00", start: "08:00", end: "09:30" },
  { label: "09:45", start: "09:45", end: "11:15" },
  { label: "11:30", start: "11:30", end: "13:00" },
  { label: "14:00", start: "14:00", end: "15:30" },
  { label: "15:45", start: "15:45", end: "17:15" },
  { label: "17:30", start: "17:30", end: "19:00" },
];

const DAYS = [0, 1, 2, 3, 4, 5]; // Mon-Sat
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const TYPE_COLORS: Record<string, string> = {
  CM: "bg-blue-100 border-blue-300 text-blue-800",
  TD: "bg-emerald-100 border-emerald-300 text-emerald-800",
  TP: "bg-amber-100 border-amber-300 text-amber-800",
};

interface Props {
  seances: Seance[];
  ues: UeInfo[];
  enseignants: EnseignantInfo[];
  salles: SalleInfo[];
  weekStart: Date;
  onEdit?: (s: Seance) => void;
  onDelete?: (id: string) => void;
  loading: boolean;
  perturbations?: Perturbation[];
}

const WeekCalendar: React.FC<Props> = ({ seances, ues, enseignants, salles, weekStart, onEdit, onDelete, loading, perturbations = [] }) => {
  const ueMap = useMemo(() => new Map(ues.map(u => [u.id, u])), [ues]);
  const ensMap = useMemo(() => new Map(enseignants.map(e => [e.id, e])), [enseignants]);
  const salleMap = useMemo(() => new Map(salles.map(s => [s.id, s])), [salles]);

  const getSeancesFor = (dayOffset: number, slotStart: string) => {
    const date = format(addDays(weekStart, dayOffset), "yyyy-MM-dd");
    return seances.filter(s => s.seance_date === date && s.start_time?.substring(0, 5) === slotStart);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-px bg-border rounded-t-lg overflow-hidden">
          <div className="bg-muted p-2 text-xs font-medium text-muted-foreground text-center">Heure</div>
          {DAYS.map((d, i) => {
            const date = addDays(weekStart, d);
            const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            return (
              <div key={d} className={`p-2 text-center text-xs font-medium ${isToday ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <div>{DAY_LABELS[i]}</div>
                <div className="text-[10px]">{format(date, "d MMM", { locale: fr })}</div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        {TIME_SLOTS.map(slot => (
          <div key={slot.label} className="grid grid-cols-[80px_repeat(6,1fr)] gap-px bg-border">
            <div className="bg-card p-2 text-xs text-muted-foreground text-center flex flex-col justify-center">
              <div>{slot.start}</div>
              <div className="text-[10px]">{slot.end}</div>
            </div>
            {DAYS.map(d => {
              const cellSeances = getSeancesFor(d, slot.start);
              return (
                <div key={d} className="bg-card p-1 min-h-[80px] space-y-1">
                  {cellSeances.map(s => {
                    const ue = ueMap.get(s.ue_id);
                    const ens = ensMap.get(s.enseignant_id);
                    const salle = s.salle_id ? salleMap.get(s.salle_id) : null;
                    const cancelled = isSeanceCancelled(s, perturbations);
                    return (
                      <div
                        key={s.id}
                        className={`rounded border p-1.5 text-[11px] leading-tight cursor-pointer transition-shadow hover:shadow-md ${cancelled ? "bg-red-50 border-red-300 opacity-70 line-through" : TYPE_COLORS[s.type] || "bg-muted"}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold truncate flex-1">{ue?.name || "UE"}</div>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{s.type}</Badge>
                        </div>
                        <div className="text-[10px] mt-0.5 truncate">
                          {ens ? `${ens.first_name} ${ens.last_name}` : "—"}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] mt-0.5">
                          {s.is_online ? (
                            <><Video className="h-3 w-3" /> En ligne</>
                          ) : (
                            <><MapPin className="h-3 w-3" /> {salle?.name || "—"}</>
                          )}
                        </div>
                        <div className="text-[10px] opacity-70">{s.group_name}{cancelled && " — ANNULÉ"}</div>
                        {(onEdit || onDelete) && (
                          <div className="flex gap-1 mt-1">
                            {onEdit && (
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onEdit(s); }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekCalendar;
