import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";

// ── Type exporté — plus de champ password ──────────────────
export interface AssistantData {
  fullName: string;
  email: string;
}

interface Props {
  data: AssistantData;
  onNext: (data: AssistantData) => void;
  onBack: () => void;
}

const StepAssistantAccount: React.FC<Props> = ({ data, onNext, onBack }) => {
  const [fullName, setFullName] = useState(data.fullName);
  const [email, setEmail] = useState(data.email);

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Veuillez remplir le nom et l'adresse email.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Adresse email invalide.");
      return;
    }
    onNext({ fullName: fullName.trim(), email: email.trim() });
  };

  /** Ignorer cette étape — invitation à faire depuis le dashboard */
  const handleSkip = () => {
    onNext({ fullName: "", email: "" });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Invitez votre assistant de département</CardTitle>
            <CardDescription>
              Votre assistant recevra un email pour créer son mot de passe et accéder à Departo.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-md bg-blue-50 border border-blue-100 p-3 flex gap-2 text-xs text-blue-700">
          <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          L'invitation sera envoyée automatiquement à la fin de la configuration.
        </div>

        <div className="space-y-2">
          <Label htmlFor="asst-name">Nom complet *</Label>
          <Input
            id="asst-name"
            placeholder="Nom de l'assistant"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="asst-email">Adresse email *</Label>
          <Input
            id="asst-email"
            type="email"
            placeholder="assistant@universite.dz"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        <div className="flex justify-between items-center pt-1">
          <Button variant="outline" onClick={onBack}>Précédent</Button>
          <Button onClick={handleSubmit}>Suivant</Button>
        </div>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            Je le ferai plus tard depuis mon dashboard
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepAssistantAccount;
