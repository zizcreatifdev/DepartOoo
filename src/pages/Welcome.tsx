import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";

const Welcome = () => {
  const { profile, role, department } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="pt-10 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Bienvenue sur Departo, {profile?.full_name || "Utilisateur"} !
            </h1>
            <p className="text-muted-foreground">
              {department
                ? `Votre département "${department.name}" est prêt.`
                : "Votre espace est configuré."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>
              Rôle : <span className="font-medium capitalize text-foreground">{role || "Non défini"}</span>
            </span>
          </div>

          <Button size="lg" onClick={() => navigate("/dashboard")} className="mt-4">
            Accéder au dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Welcome;
