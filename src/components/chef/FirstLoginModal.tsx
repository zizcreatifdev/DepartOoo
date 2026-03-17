/**
 * FirstLoginModal
 * Affiché lors de la première connexion d'un chef créé par l'owner.
 * Le chef peut changer son mot de passe ou le conserver pour l'instant.
 * Dans les deux cas, is_first_login est mis à false.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onDone: () => void;  // appelé après changement ou report
}

const FirstLoginModal = ({ open, onDone }: Props) => {
  const [mode,        setMode]       = useState<"ask" | "change" | "done">("ask");
  const [newPwd,      setNewPwd]     = useState("");
  const [confirmPwd,  setConfirmPwd] = useState("");
  const [showPwd,     setShowPwd]    = useState(false);
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState<string | null>(null);

  async function markFirstLoginDone() {
    // Mettre is_first_login = false dans profiles
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any)
        .from("profiles")
        .update({ is_first_login: false })
        .eq("id", user.id);
    }
  }

  async function handleKeep() {
    setLoading(true);
    try {
      await markFirstLoginDone();
      toast.success("Vous pourrez changer votre mot de passe dans les paramètres.");
      onDone();
    } finally {
      setLoading(false);
    }
  }

  async function handleChange() {
    setError(null);
    if (!newPwd) return setError("Entrez un nouveau mot de passe.");
    if (newPwd.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    if (newPwd !== confirmPwd) return setError("Les mots de passe ne correspondent pas.");

    setLoading(true);
    try {
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPwd });
      if (pwdError) throw pwdError;

      await markFirstLoginDone();
      setMode("done");
    } catch (e: any) {
      setError(e.message ?? "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {/* Pas de fermeture manuelle — l'utilisateur doit choisir */}
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {mode === "ask" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Bienvenue sur Departo !
              </DialogTitle>
              <DialogDescription>
                Votre compte a été créé par votre administrateur.
                Souhaitez-vous modifier votre mot de passe maintenant ?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <Button
                className="w-full"
                onClick={() => setMode("change")}
              >
                Changer mon mot de passe
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleKeep}
                disabled={loading}
              >
                Conserver pour l'instant
              </Button>
            </div>
          </>
        )}

        {mode === "change" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Nouveau mot de passe
              </DialogTitle>
              <DialogDescription>
                Choisissez un mot de passe personnel (8 caractères minimum).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  placeholder="Répétez le mot de passe"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setMode("ask"); setError(null); setNewPwd(""); setConfirmPwd(""); }}
              >
                Retour
              </Button>
              <Button
                className="flex-1"
                onClick={handleChange}
                disabled={loading}
              >
                {loading ? "Enregistrement…" : "Confirmer"}
              </Button>
            </div>
          </>
        )}

        {mode === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Mot de passe mis à jour !
              </DialogTitle>
              <DialogDescription>
                Votre nouveau mot de passe est enregistré. Vous pouvez maintenant accéder
                à votre tableau de bord.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full mt-2" onClick={onDone}>
              Accéder au tableau de bord
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FirstLoginModal;
