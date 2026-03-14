import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import type { Seance, UeInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";
import type { Perturbation } from "./PerturbationFormDialog";
import { isSeanceCancelled } from "@/lib/perturbationUtils";

interface Props {
  seances: Seance[];
  ues: UeInfo[];
  perturbations: Perturbation[];
  onPlanRattrapage?: (ueId: string, type: string) => void;
}

const durationHours = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
};

const CancelledHoursSummary: React.FC<Props> = ({ seances, ues, perturbations, onPlanRattrapage }) => {
  const summary = useMemo(() => {
    const cancelledSeances = seances.filter(s => isSeanceCancelled(s, perturbations));

    return ues.map(ue => {
      const ueCancelled = cancelledSeances.filter(s => s.ue_id === ue.id);
      const cmCancelled = ueCancelled.filter(s => s.type === "CM").reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const tdCancelled = ueCancelled.filter(s => s.type === "TD").reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const tpCancelled = ueCancelled.filter(s => s.type === "TP").reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const total = cmCancelled + tdCancelled + tpCancelled;
      return { ue, cmCancelled, tdCancelled, tpCancelled, total };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [seances, ues, perturbations]);

  if (summary.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune heure annulée à rattraper.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
        Heures à rattraper par UE
      </h3>
      {summary.map(({ ue, cmCancelled, tdCancelled, tpCancelled, total }) => (
        <Card key={ue.id} className="border-destructive/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-medium text-sm">{ue.name}</h4>
              <span className="text-xs font-semibold text-destructive">{total.toFixed(1)}h à rattraper</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 text-[11px]">
                {cmCancelled > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700">CM</Badge>
                    {cmCancelled.toFixed(1)}h
                  </div>
                )}
                {tdCancelled > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700">TD</Badge>
                    {tdCancelled.toFixed(1)}h
                  </div>
                )}
                {tpCancelled > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700">TP</Badge>
                    {tpCancelled.toFixed(1)}h
                  </div>
                )}
              </div>
              {onPlanRattrapage && (
                <Button variant="outline" size="sm" className="text-xs h-7 ml-auto" onClick={() => onPlanRattrapage(ue.id, "")}>
                  <CalendarPlus className="h-3 w-3 mr-1" /> Planifier un rattrapage
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CancelledHoursSummary;
