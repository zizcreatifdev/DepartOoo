/**
 * CreateChefDialog
 * Permet à l'owner de créer un compte chef de département.
 * Email généré : <username>@departo.app
 * Appelle la Edge Function create-chef.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departmentId: string;
  departmentName: string;
  onCreated?: () => void;
}

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

const CreateChefDialog = ({
  open, onOpenChange, departmentId, departmentName, onCreated,
}: Props) => {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const email = username.trim()
    ? `${username.trim().toLowerCase()}@departo.app`
    : "";

  function reset() {
    setUsername(""); setFullName("");
    setPassword(generatePassword()); setShowPwd(false);
    setError(null); setCopied(false); setSuccess(false);
  }

  async function handleCreate() {
    setError(null);
    if (!username.trim()) return setError("Le nom d'utilisateur est requis.");
    if (!fullName.trim())  return setError("Le nom complet est requis.");
    if (password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("create-chef", {
        body: {
          username:      username.trim().toLowerCase(),
          full_name:     fullName.trim(),
          department_id: departmentId,
          password,
        },
      });

      if (res.error) {
        // Extraire le vrai message depuis le contexte de l'erreur HTTP
        const ctx = (res.error as any).context;
        throw new Error(ctx?.error ?? res.data?.error ?? res.error.message);
      }
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`Chef créé — ${email}`);
      onCreated?.();
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    const text = `Identifiants Departo\nEmail : ${email}\nMot de passe : ${password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Identifiants copiés");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Créer un chef de département
          </DialogTitle>
          <DialogDescription>
            Département : <strong>{departmentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          /* ── Récapitulatif après création ── */
          <div className="py-2 space-y-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4" /> Compte créé avec succès
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Nom</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Email de connexion</span>
                  <span className="font-mono text-xs text-primary">{email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Mot de passe temporaire</span>
                  <span className="font-mono text-xs bg-white border rounded px-2 py-0.5">{password}</span>
                </div>
              </div>
            </div>
            <Button className="w-full gap-2" variant="outline" onClick={copyCredentials}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier les identifiants"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Transmets ces identifiants au chef. Il pourra changer son mot de passe à la première connexion.
            </p>
          </div>
        ) : (
          /* ── Formulaire de création ── */
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet *</Label>
              <Input
                placeholder="ex: Mamadou Diallo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Identifiant (username) *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="ex: m.diallo"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground text-xs whitespace-nowrap">@departo.app</span>
              </div>
              {email && (
                <p className="text-xs text-primary font-mono mt-1">📧 {email}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Lettres, chiffres, . _ - uniquement. C'est l'email de connexion.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mot de passe temporaire *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline" size="icon"
                  onClick={copyCredentials}
                  title="Copier les identifiants"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Le chef peut modifier son mot de passe à sa première connexion.
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {success ? (
            <Button className="w-full" onClick={() => { onOpenChange(false); reset(); }}>
              Fermer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Création…" : "Créer le compte"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChefDialog;
