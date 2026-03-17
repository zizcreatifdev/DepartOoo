/**
 * ParametresPage — Owner
 * Paramètres globaux de la plateforme Departo.
 */
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings, Globe, CreditCard, Bell, Shield,
  ExternalLink, Mail, Building2,
} from "lucide-react";
import { toast } from "sonner";

const ParametresPage = () => {
  return (
    <DashboardLayout title="Paramètres">
      <div className="space-y-6 max-w-3xl">

        {/* ── Plateforme ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> Plateforme
            </CardTitle>
            <CardDescription>Informations générales de la plateforme Departo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom de la plateforme</Label>
                <Input defaultValue="Departo" disabled className="bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL de production</Label>
                <div className="flex gap-2">
                  <Input defaultValue="departo.vercel.app" disabled className="bg-muted/40" />
                  <Button
                    variant="outline" size="icon"
                    onClick={() => window.open("https://departo.vercel.app", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email de contact</Label>
                <Input defaultValue="contact@departo.sn" disabled className="bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Version</Label>
                <Input defaultValue="1.0.0 — MVP" disabled className="bg-muted/40" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Plans tarifaires ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Plans tarifaires
            </CardTitle>
            <CardDescription>Configuration des offres disponibles sur la plateforme.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                name: "Starter",
                price: "Gratuit (1 mois)",
                features: "Emploi du temps, Présences, Enseignants",
                badge: null,
                note: "Après 30 jours, les fonctionnalités se verrouillent automatiquement.",
              },
              {
                name: "Pro",
                price: "Sur devis",
                features: "Tout Starter + Examens, Notes, Documents, API",
                badge: "Populaire",
                note: "Contacter l'équipe pour un devis personnalisé.",
              },
              {
                name: "Université",
                price: "Sur devis",
                features: "Tout Pro + Multi-département, Support dédié",
                badge: null,
                note: "Pour les institutions avec plusieurs départements.",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{plan.name}</p>
                    {plan.badge && (
                      <Badge variant="default" className="text-[10px]">{plan.badge}</Badge>
                    )}
                    <span className="text-xs text-primary font-medium ml-auto">{plan.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.features}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{plan.note}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Notifications ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications owner
            </CardTitle>
            <CardDescription>Alertes reçues sur le tableau de bord owner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Nouvel onboarding complété",    active: true },
              { label: "Département inactif >21 jours", active: true },
              { label: "Nouveau prospect pipeline",      active: true },
              { label: "Rapport hebdomadaire email",     active: false },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between py-1">
                <span className="text-sm text-foreground">{n.label}</span>
                <Badge
                  variant={n.active ? "default" : "outline"}
                  className={`text-[10px] ${!n.active ? "text-muted-foreground" : ""}`}
                >
                  {n.active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ))}
            <Separator />
            <p className="text-xs text-muted-foreground">
              La configuration fine des notifications sera disponible dans une prochaine mise à jour.
            </p>
          </CardContent>
        </Card>

        {/* ── Sécurité ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Sécurité & Accès
            </CardTitle>
            <CardDescription>Gestion de l'accès owner et de la sécurité globale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Compte Owner</p>
                <p className="text-xs text-muted-foreground">saas-owner@departo.sn</p>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                Actif
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Supabase RLS</p>
                <p className="text-xs text-muted-foreground">Policies Row Level Security actives</p>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                Configuré
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">PWA</p>
                <p className="text-xs text-muted-foreground">Progressive Web App — vite-plugin-pwa</p>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                Actif
              </Badge>
            </div>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                window.open("https://supabase.com/dashboard", "_blank");
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ouvrir Supabase Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* ── Contact / Support ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Contact & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email owner</p>
                <p className="text-xs text-muted-foreground">saas-owner@departo.sn</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Les formulaires d'intérêt soumis par les prospects arrivent dans la section{" "}
              <strong>Acquisition → Pipeline</strong> du tableau de bord.
            </p>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default ParametresPage;
