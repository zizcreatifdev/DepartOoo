import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export interface AssistantData {
  fullName: string;
  email: string;
  password: string;
}

interface Props {
  data: AssistantData;
  onNext: (data: AssistantData) => void;
  onBack: () => void;
}

const StepAssistantAccount: React.FC<Props> = ({ data, onNext, onBack }) => {
  const [fullName, setFullName] = useState(data.fullName);
  const [email, setEmail] = useState(data.email);
  const [password, setPassword] = useState(data.password);

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    onNext({ fullName: fullName.trim(), email: email.trim(), password });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Compte Assistant de département</CardTitle>
            <CardDescription>Créez le compte de votre assistant pour l'aider dans la gestion</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="asst-name">Nom complet *</Label>
          <Input id="asst-name" placeholder="Nom de l'assistant" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="asst-email">Adresse email *</Label>
          <Input id="asst-email" type="email" placeholder="assistant@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="asst-password">Mot de passe temporaire *</Label>
          <Input id="asst-password" type="password" placeholder="Minimum 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">L'assistant pourra modifier son mot de passe après sa première connexion.</p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Précédent</Button>
          <Button onClick={handleSubmit}>Suivant</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepAssistantAccount;
