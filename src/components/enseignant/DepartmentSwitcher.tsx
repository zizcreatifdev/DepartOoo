import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EnseignantProfileWithDept } from "@/hooks/useEnseignantProfile";

interface Props {
  profiles: EnseignantProfileWithDept[];
  current: EnseignantProfileWithDept;
  onSwitch: (departmentId: string) => void;
}

const DepartmentSwitcher = ({ profiles, current, onSwitch }: Props) => {
  if (profiles.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-muted-foreground font-medium">Département :</span>
      <Select value={current.department_id} onValueChange={onSwitch}>
        <SelectTrigger className="w-[250px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {profiles.map(p => (
            <SelectItem key={p.department_id} value={p.department_id}>
              {p.department_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DepartmentSwitcher;
