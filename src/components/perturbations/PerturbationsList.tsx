import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Perturbation } from "./PerturbationFormDialog";

const TYPE_LABELS: Record<string, string> = {
  greve: "Grève",
  jour_ferie: "Jour férié",
  fermeture_administrative: "Fermeture admin.",
  intemperies: "Intempéries",
};

const TYPE_COLORS: Record<string, string> = {
  greve: "bg-red-100 text-red-800 border-red-300",
  jour_ferie: "bg-blue-100 text-blue-800 border-blue-300",
  fermeture_administrative: "bg-orange-100 text-orange-800 border-orange-300",
  intemperies: "bg-purple-100 text-purple-800 border-purple-300",
};

interface Props {
  perturbations: Perturbation[];
  onEdit: (p: Perturbation) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

const PerturbationsList: React.FC<Props> = ({ perturbations, onEdit, onDelete, canEdit }) => {
  if (perturbations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Aucune perturbation déclarée pour cette année académique.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {perturbations.map(p => {
        const isSingleDay = p.start_date === p.end_date;
        const dateLabel = isSingleDay
          ? format(new Date(p.start_date), "d MMMM yyyy", { locale: fr })
          : `${format(new Date(p.start_date), "d MMM", { locale: fr })} → ${format(new Date(p.end_date), "d MMM yyyy", { locale: fr })}`;

        return (
          <Card key={p.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={TYPE_COLORS[p.type] || ""}>{TYPE_LABELS[p.type]}</Badge>
                    <h4 className="font-medium text-sm">{p.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{dateLabel}</p>
                  {(p.affected_levels?.length > 0 || p.affected_groups?.length > 0) && (
                    <div className="flex gap-2 flex-wrap mt-1">
                      {p.affected_levels?.map(l => (
                        <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                      ))}
                      {p.affected_groups?.map(g => (
                        <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
                      ))}
                    </div>
                  )}
                  {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PerturbationsList;
