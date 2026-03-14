import { AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ModuleBlocked = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = role === "assistant" ? "/dashboard/assistant" : "/dashboard/chef";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full text-center border-destructive/30">
        <CardContent className="pt-10 pb-8 space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-bold">Module verrouillé</h2>
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p>
              Ce module n'est pas accessible tant qu'au moins une maquette pédagogique n'a pas été validée par le chef de département.
              Veuillez d'abord compléter et valider le référentiel pédagogique.
            </p>
          </div>
          <Button onClick={() => navigate(`${basePath}/referentiel`)}>
            Aller au Référentiel Pédagogique
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleBlocked;
