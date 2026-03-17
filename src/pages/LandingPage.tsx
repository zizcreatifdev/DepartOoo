import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  CalendarDays,
  Users,
  ClipboardList,
  BookOpen,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  FileText,
  Bell,
  Building2,
  Mail,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Emploi du temps intelligent",
    description: "Planifiez les séances avec détection automatique des conflits de salles et d'enseignants.",
  },
  {
    icon: Users,
    title: "Gestion des enseignants",
    description: "Suivi des disponibilités, quotas horaires, heures complémentaires et invitations par email.",
  },
  {
    icon: ClipboardList,
    title: "Présences & Absences",
    description: "Feuilles de présence numériques, alertes de dépassement de seuil et historique complet.",
  },
  {
    icon: BookOpen,
    title: "Notes & Résultats",
    description: "Import Excel, calcul des moyennes pondérées et export des relevés de notes en PDF.",
  },
  {
    icon: GraduationCap,
    title: "Examens",
    description: "Planification, affectation des salles et surveillants, suivi du dépôt des sujets.",
  },
  {
    icon: BarChart3,
    title: "Référentiel & Maquettes",
    description: "Gestion des UE, coefficients, crédits ECTS et validation des maquettes pédagogiques.",
  },
  {
    icon: FileText,
    title: "Documents PDF automatisés",
    description: "Emplois du temps, listes de présence et relevés générés avec le logo de votre université.",
  },
  {
    icon: Bell,
    title: "Alertes en temps réel",
    description: "Notifications automatiques pour les absences critiques, perturbations et documents obsolètes.",
  },
  {
    icon: Building2,
    title: "Multi-universités",
    description: "Chaque département est lié à son université avec son logo officiel sur tous les documents.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "Gratuit",
    period: "1 mois d'essai",
    description: "Accès complet pendant 30 jours, sans carte bancaire",
    badge: null,
    features: [
      "1 assistant de département",
      "30 enseignants maximum",
      "Toutes les fonctionnalités incluses",
      "Export PDF & Excel",
      "Logo université sur les documents",
      "Support par email",
    ],
    cta: "Commencer l'essai gratuit",
    ctaAction: "login",
    highlight: false,
    note: "Après 30 jours, les fonctionnalités se verrouillent jusqu'à souscription.",
  },
  {
    name: "Pro",
    price: "Sur devis",
    period: "",
    description: "Pour les départements qui veulent continuer après l'essai",
    badge: "Populaire",
    features: [
      "2 assistants de département",
      "60 enseignants maximum",
      "Toutes les fonctionnalités illimitées",
      "Notifications WhatsApp",
      "Renouvellement annuel ou mensuel",
      "Support prioritaire",
    ],
    cta: "Je suis intéressé",
    ctaAction: "interest",
    highlight: true,
    note: null,
  },
  {
    name: "Université",
    price: "Sur devis",
    period: "",
    description: "Pour les établissements multi-départements",
    badge: null,
    features: [
      "Assistants & enseignants illimités",
      "Tous les départements de l'université",
      "Dashboard centralisé",
      "Accompagnement & formations",
      "Intégration systèmes existants",
      "Compte dédié",
    ],
    cta: "Nous contacter",
    ctaAction: "contact",
    highlight: false,
    note: null,
  },
];

const benefits = [
  "Réduction de 80% du temps de planification",
  "Zéro conflit de salles et d'enseignants",
  "Suivi en temps réel de l'avancement pédagogique",
  "Documents PDF officiels générés automatiquement",
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Departo</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Connexion
            </Button>
            <Button onClick={() => navigate("/login")}>
              Commencer
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <Zap className="h-3.5 w-3.5 text-primary" />
          Conçu pour les universités africaines
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          La gestion de votre{" "}
          <span className="text-primary">département universitaire</span>{" "}
          enfin simple
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Emploi du temps, enseignants, examens, notes et présences — tout centralisé
          dans un seul outil pensé pour les chefs de département sénégalais.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/login")} className="text-base px-8">
            Démarrer gratuitement
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            Découvrir les fonctionnalités
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Aucune carte bancaire requise · Starter gratuit pour toujours
        </p>
      </section>

      {/* ── Benefits strip ── */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Une suite complète d'outils conçus spécifiquement pour les départements universitaires africains.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="group hover:shadow-md transition-shadow border-border/60">
              <CardContent className="pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Un espace pour chaque rôle
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Chaque utilisateur accède à un tableau de bord adapté à ses responsabilités.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                role: "Chef de département",
                desc: "Vision globale, validation des maquettes, gestion de l'équipe et accès complet à tous les modules.",
                icon: Shield,
              },
              {
                role: "Assistant",
                desc: "Saisie des emplois du temps, gestion des présences, invitations enseignants et support opérationnel.",
                icon: ClipboardList,
              },
              {
                role: "Enseignant",
                desc: "Consultation de l'emploi du temps, saisie des disponibilités, notes et dépôt de sujets.",
                icon: BookOpen,
              },
            ].map((r) => (
              <Card key={r.role} className="text-center">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                    <r.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{r.role}</h3>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tarifs simples et transparents
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Commencez gratuitement. Passez au plan supérieur quand votre département grandit.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg ring-1 ring-primary/30" : "border-border/60"}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-0.5 text-xs">{plan.badge}</Badge>
                </div>
              )}
              <CardContent className="pt-8 flex flex-col flex-1">
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground mb-1 ml-1">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.note && (
                  <p className="text-xs text-muted-foreground italic mb-4 border-t pt-3">
                    {plan.note}
                  </p>
                )}

                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => {
                    if (plan.ctaAction === "contact" || plan.ctaAction === "interest") {
                      window.location.href = "mailto:contact@departo.app";
                    } else {
                      navigate("/login");
                    }
                  }}
                >
                  {plan.cta}
                  {plan.name !== "Université" && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à moderniser votre département ?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Rejoignez les premiers départements qui ont adopté Departo.
            Configuration en moins de 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/login")}
              className="text-base px-10"
            >
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:text-primary-foreground hover:bg-white/10"
              onClick={() => { window.location.href = "mailto:contact@departo.app"; }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Nous contacter
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Departo</span>
            <span>— Gestion académique pour l'Afrique</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:contact@departo.app" className="hover:text-foreground transition-colors">
              contact@departo.app
            </a>
            <span>©&nbsp;{new Date().getFullYear()} Departo</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
