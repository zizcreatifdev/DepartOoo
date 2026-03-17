/**
 * NouveauClientWizard
 * Wizard 3 étapes pour créer un client complet :
 *   Étape 1 — Université
 *   Étape 2 — Département
 *   Étape 3 — Compte Chef
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap, Building2, UserPlus,
  Eye, EyeOff, Copy, Check, ChevronRight, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createUniversity } from "@/services/universities.service";

// ── Types ─────────────────────────────────────────────────────
interface Step1Data { name: string; short_name: string; city: string; country: string }
interface Step2Data { name: string; offre: "starter" | "pro" | "universite" }
interface Step3Data { full_name: string; username: string; password: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────
function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

const STEP_LABELS = [
  { icon: GraduationCap, label: "Université" },
  { icon: Building2,     label: "Département" },
  { icon: UserPlus,      label: "Chef de département" },
];

// ── Composant ─────────────────────────────────────────────────
export default function NouveauClientWizard({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Données par étape
  const [s1, setS1] = useState<Step1Data>({ name: "", short_name: "", city: "", country: "Sénégal" });
  const [s2, setS2] = useState<Step2Data>({ name: "", offre: "starter" });
  const [s3, setS3] = useState<Step3Data>({ full_name: "", username: "", password: generatePassword() });

  // IDs créés (pour enchaîner les étapes)
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const email = s3.username.trim() ? `${s3.username.trim().toLowerCase()}@departo.app` : "";

  // ── Reset ──────────────────────────────────────────────────
  function reset() {
    setStep(0); setError(null); setCopied(false); setShowPwd(false);
    setS1({ name: "", short_name: "", city: "", country: "Sénégal" });
    setS2({ name: "", offre: "starter" });
    setS3({ full_name: "", username: "", password: generatePassword() });
    setUniversityId(null); setDepartmentId(null);
  }

  function close() { onOpenChange(false); reset(); }

  // ── Étape 1 → créer université ─────────────────────────────
  async function handleStep1() {
    setError(null);
    if (!s1.name.trim()) return setError("Le nom de l'université est requis.");
    setLoading(true);
    try {
      const univ = await createUniversity({
        name:       s1.name.trim(),
        short_name: s1.short_name.trim() || undefined,
        city:       s1.city.trim() || undefined,
        country:    s1.country.trim() || "Sénégal",
        statut:     "officielle",
      });
      setUniversityId(univ.id);
      setStep(1);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création de l'université.");
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 2 → créer département ───────────────────────────
  async function handleStep2() {
    setError(null);
    if (!s2.name.trim()) return setError("Le nom du département est requis.");
    if (!universityId) return setError("Université manquante.");
    setLoading(true);
    try {
      // On cherche le nom de l'université pour la colonne dénormalisée
      const { data: univData } = await (supabase as any)
        .from("universities")
        .select("name, short_name")
        .eq("id", universityId)
        .single();

      const { data: dept, error: deptErr } = await (supabase as any)
        .from("departments")
        .insert({
          name:            s2.name.trim(),
          university_id:   universityId,
          university:      univData?.name ?? "",
          offre:           s2.offre,
          onboarding_completed: false,
        })
        .select()
        .single();

      if (deptErr) throw deptErr;
      setDepartmentId(dept.id);
      setStep(2);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création du département.");
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 3 → créer chef ──────────────────────────────────
  async function handleStep3() {
    setError(null);
    if (!s3.username.trim()) return setError("Le nom d'utilisateur est requis.");
    if (!s3.full_name.trim()) return setError("Le nom complet est requis.");
    if (s3.password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    if (!departmentId) return setError("Département manquant.");
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("create-chef", {
        body: {
          username:      s3.username.trim().toLowerCase(),
          full_name:     s3.full_name.trim(),
          department_id: departmentId,
          password:      s3.password,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`✅ Client créé — ${email}`);
      onCreated?.();
      close();
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création du chef.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    const text = `Identifiants Departo\nEmail : ${email}\nMot de passe : ${s3.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Identifiants copiés");
  }

  function handleNext() {
    if (step === 0) handleStep1();
    else if (step === 1) handleStep2();
    else handleStep3();
  }

  // ── Rendu étape ───────────────────────────────────────────
  function renderStep() {
    if (step === 0) return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom de l'université *</Label>
          <Input
            placeholder="ex: Université Cheikh Anta Diop"
            value={s1.name}
            onChange={(e) => setS1({ ...s1, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Acronyme</Label>
          <Input
            placeholder="ex: UCAD"
            value={s1.short_name}
            onChange={(e) => setS1({ ...s1, short_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Ville</Label>
            <Input
              placeholder="ex: Dakar"
              value={s1.city}
              onChange={(e) => setS1({ ...s1, city: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pays</Label>
            <Input
              value={s1.country}
              onChange={(e) => setS1({ ...s1, country: e.target.value })}
            />
          </div>
        </div>
      </div>
    );

    if (step === 1) return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom du département *</Label>
          <Input
            placeholder="ex: Département Informatique"
            value={s2.name}
            onChange={(e) => setS2({ ...s2, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Offre souscrite *</Label>
          <Select value={s2.offre} onValueChange={(v: any) => setS2({ ...s2, offre: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="universite">Université</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );

    // Étape 3
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom complet *</Label>
          <Input
            placeholder="ex: Mamadou Diallo"
            value={s3.full_name}
            onChange={(e) => setS3({ ...s3, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Identifiant (username) *</Label>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="ex: m.diallo"
              value={s3.username}
              onChange={(e) =>
                setS3({ ...s3, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, "") })
              }
              className="flex-1"
            />
            <span className="text-muted-foreground text-xs whitespace-nowrap">@departo.app</span>
          </div>
          {email && (
            <p className="text-xs text-primary font-mono mt-1">📧 {email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mot de passe temporaire *</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showPwd ? "text" : "password"}
                value={s3.password}
                onChange={(e) => setS3({ ...s3, password: e.target.value })}
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
            <Button variant="outline" size="icon" onClick={copyCredentials} title="Copier les identifiants">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Le chef peut modifier son mot de passe à sa première connexion.
          </p>
        </div>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>

          {/* Indicateur de progression */}
          <div className="flex items-center gap-1 mt-3">
            {STEP_LABELS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done   = i < step;
              return (
                <div key={i} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors
                    ${done   ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : ""}
                    ${active ? "bg-primary text-primary-foreground" : ""}
                    ${!active && !done ? "bg-muted text-muted-foreground" : ""}
                  `}>
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-px ${done ? "bg-emerald-300" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Contenu de l'étape */}
        <div className="py-2 min-h-[180px]">
          {renderStep()}
        </div>

        {/* Erreur */}
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={step === 0 ? close : () => { setStep(step - 1); setError(null); }}
            disabled={loading}
          >
            {step === 0 ? "Annuler" : (
              <><ChevronLeft className="h-4 w-4 mr-1" /> Retour</>
            )}
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {loading
              ? (step === 2 ? "Création…" : "Enregistrement…")
              : step < 2
                ? (<>Suivant <ChevronRight className="h-4 w-4 ml-1" /></>)
                : "Créer le client"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
