import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Building2, UserCog, UserPlus, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DepartmentData } from "./StepDepartmentInfo";
import type { ChefData } from "./StepChefAccount";
import type { AssistantData } from "./StepAssistantAccount";

interface Props {
  departmentData: DepartmentData;
  chefData: ChefData;
  assistantData: AssistantData;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const StepConfirmation: React.FC<Props> = ({ departmentData, chefData, assistantData, onBack, onConfirm, loading }) => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Récapitulatif</CardTitle>
            <CardDescription>Vérifiez les informations avant de finaliser</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Department info */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Building2 className="h-4 w-4" />
            Département
          </div>
          <div className="grid gap-2 text-sm">
            <div><span className="text-muted-foreground">Nom :</span> {departmentData.name}</div>
            <div><span className="text-muted-foreground">Université :</span> {departmentData.university}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Filières :</span>
              {departmentData.filieres.map((f, i) => (
                <Badge key={i} variant="secondary"><BookOpen className="h-3 w-3 mr-1" />{f}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Niveaux :</span>
              {departmentData.levels.map((l) => (
                <Badge key={l} variant="outline"><GraduationCap className="h-3 w-3 mr-1" />{l}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Chef info */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <UserCog className="h-4 w-4" />
            Chef de département
          </div>
          <div className="grid gap-1 text-sm">
            <div><span className="text-muted-foreground">Nom :</span> {chefData.fullName}</div>
            <div><span className="text-muted-foreground">Email :</span> {chefData.email}</div>
          </div>
        </div>

        {/* Assistant info */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <UserPlus className="h-4 w-4" />
            Assistant de département
          </div>
          <div className="grid gap-1 text-sm">
            <div><span className="text-muted-foreground">Nom :</span> {assistantData.fullName}</div>
            <div><span className="text-muted-foreground">Email :</span> {assistantData.email}</div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Précédent</Button>
          <Button onClick={onConfirm} disabled={loading}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {loading ? "Finalisation..." : "Terminer et accéder au dashboard"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepConfirmation;
