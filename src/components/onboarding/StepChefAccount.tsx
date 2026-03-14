import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface ChefData {
  fullName: string;
  email: string;
}

interface Props {
  data: ChefData;
  onNext: (data: ChefData) => void;
  onBack: () => void;
}

const StepChefAccount: React.FC<Props> = ({ data, onNext, onBack }) => {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(data.fullName || profile?.full_name || "");
  const email = profile?.email || data.email;

  const handleSubmit = () => {
    if (!fullName.trim()) {
      return;
    }
    onNext({ fullName: fullName.trim(), email });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Compte Chef de département</CardTitle>
            <CardDescription>Confirmez vos informations en tant que chef de département</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="chef-name">Nom complet *</Label>
          <Input id="chef-name" placeholder="Votre nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chef-email">Adresse email</Label>
          <Input id="chef-email" type="email" value={email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">L'email est lié à votre compte et ne peut pas être modifié ici.</p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Précédent</Button>
          <Button onClick={handleSubmit}>Suivant</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepChefAccount;
