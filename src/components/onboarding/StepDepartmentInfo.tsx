import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, Building2 } from "lucide-react";
import { toast } from "sonner";

const allLevels = [
  { value: "L1" as const, label: "Licence 1 (L1)" },
  { value: "L2" as const, label: "Licence 2 (L2)" },
  { value: "L3" as const, label: "Licence 3 (L3)" },
  { value: "M1" as const, label: "Master 1 (M1)" },
  { value: "M2" as const, label: "Master 2 (M2)" },
];

export interface DepartmentData {
  name: string;
  university: string;
  filieres: string[];
  levels: ("L1" | "L2" | "L3" | "M1" | "M2")[];
}

interface Props {
  data: DepartmentData;
  onNext: (data: DepartmentData) => void;
}

const StepDepartmentInfo: React.FC<Props> = ({ data, onNext }) => {
  const [name, setName] = useState(data.name);
  const [university, setUniversity] = useState(data.university);
  const [filieres, setFilieres] = useState<string[]>(data.filieres.length > 0 ? data.filieres : [""]);
  const [levels, setLevels] = useState<("L1" | "L2" | "L3" | "M1" | "M2")[]>(data.levels);

  const addFiliere = () => setFilieres([...filieres, ""]);
  const removeFiliere = (index: number) => setFilieres(filieres.filter((_, i) => i !== index));
  const updateFiliere = (index: number, value: string) => {
    const updated = [...filieres];
    updated[index] = value;
    setFilieres(updated);
  };

  const toggleLevel = (level: "L1" | "L2" | "L3" | "M1" | "M2") => {
    setLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !university.trim()) {
      toast.error("Veuillez remplir le nom du département et l'université.");
      return;
    }
    const validFilieres = filieres.filter((f) => f.trim());
    if (validFilieres.length === 0) {
      toast.error("Ajoutez au moins une filière.");
      return;
    }
    if (levels.length === 0) {
      toast.error("Sélectionnez au moins un niveau.");
      return;
    }
    onNext({ name: name.trim(), university: university.trim(), filieres: validFilieres, levels });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Informations du département</CardTitle>
            <CardDescription>Renseignez les informations de votre département universitaire</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dept-name">Nom du département *</Label>
            <Input id="dept-name" placeholder="Ex: Informatique" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="university">Université *</Label>
            <Input id="university" placeholder="Ex: Université de Lomé" value={university} onChange={(e) => setUniversity(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Filières *</Label>
          {filieres.map((filiere, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Filière ${index + 1}`}
                value={filiere}
                onChange={(e) => updateFiliere(index, e.target.value)}
              />
              {filieres.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFiliere(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addFiliere}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une filière
          </Button>
        </div>

        <div className="space-y-3">
          <Label>Niveaux *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allLevels.map((level) => (
              <label
                key={level.value}
                className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={levels.includes(level.value)}
                  onCheckedChange={() => toggleLevel(level.value)}
                />
                <span className="text-sm font-medium">{level.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Suivant</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepDepartmentInfo;
