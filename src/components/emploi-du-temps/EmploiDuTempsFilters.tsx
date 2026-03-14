import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { EnseignantInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";

interface Props {
  enseignants: EnseignantInfo[];
  groups: string[];
  filterEnseignant: string;
  filterGroup: string;
  onEnseignantChange: (v: string) => void;
  onGroupChange: (v: string) => void;
}

const EmploiDuTempsFilters: React.FC<Props> = ({
  enseignants, groups, filterEnseignant, filterGroup, onEnseignantChange, onGroupChange,
}) => {
  return (
    <Card>
      <CardContent className="flex flex-wrap gap-4 py-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Enseignant</label>
          <Select value={filterEnseignant} onValueChange={onEnseignantChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les enseignants</SelectItem>
              {enseignants.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Groupe</label>
          <Select value={filterGroup} onValueChange={onGroupChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les groupes</SelectItem>
              {groups.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmploiDuTempsFilters;
