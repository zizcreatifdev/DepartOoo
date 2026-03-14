import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { UeInfo, Seance } from "@/pages/emploi-du-temps/EmploiDuTempsPage";
import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";
import { isSeanceCancelled } from "@/lib/perturbationUtils";

interface Props {
  ues: UeInfo[];
  seances: Seance[];
  perturbations?: Perturbation[];
}

const durationHours = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
};

const UeProgressList: React.FC<Props> = ({ ues, seances, perturbations = [] }) => {
  const progressData = useMemo(() => {
    return ues.map(ue => {
      const ueSeances = seances.filter(s => s.ue_id === ue.id && !isSeanceCancelled(s, perturbations));
      const cmDone = ueSeances.filter(s => s.type === "CM").reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const tdDone = ueSeances.filter(s => s.type === "TD").reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const tpDone = ueSeances.filter(s => s.type === "TP").reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const totalDone = cmDone + tdDone + tpDone;
      const totalPlanned = ue.volume_cm + ue.volume_td + ue.volume_tp;
      const pct = totalPlanned > 0 ? Math.min(100, Math.round((totalDone / totalPlanned) * 100)) : 0;
      return { ue, cmDone, tdDone, tpDone, totalDone, totalPlanned, pct };
    }).sort((a, b) => a.ue.name.localeCompare(b.ue.name));
  }, [ues, seances]);

  if (ues.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune UE trouvée. Validez d'abord une maquette pédagogique.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {progressData.map(({ ue, cmDone, tdDone, tpDone, totalDone, totalPlanned, pct }) => (
        <Card key={ue.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{ue.name}</h4>
              <span className="text-xs text-muted-foreground">{totalDone.toFixed(1)}h / {totalPlanned}h ({pct}%)</span>
            </div>
            <Progress value={pct} className="h-2 mb-2" />
            <div className="flex gap-3 text-[11px]">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700">CM</Badge>
                {cmDone.toFixed(1)}h / {ue.volume_cm}h
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700">TD</Badge>
                {tdDone.toFixed(1)}h / {ue.volume_td}h
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700">TP</Badge>
                {tpDone.toFixed(1)}h / {ue.volume_tp}h
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UeProgressList;
