import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Emploi du temps",
    description: "Planifiez et gérez les séances avec détection automatique des conflits.",
  },
  {
    icon: Users,
    title: "Gestion des enseignants",
    description: "Suivi des disponibilités, quotas horaires et heures complémentaires.",
  },
  {
    icon: ClipboardList,
    title: "Présences & Absences",
    description: "Feuilles de présence numériques et tableau de bord des absences.",
  },
  {
    icon: BookOpen,
    title: "Notes & Résultats",
    description: "Import Excel, calcul des moyennes pondérées et export des relevés PDF.",
  },
  {
    icon: GraduationCap,
    title: "Examens",
    description: "Planification, affectation des salles et surveillants, suivi des sujets.",
  },
  {
    icon: BarChart3,
    title: "Référentiel & Maquettes",
    description: "Gestion des UE, coefficients, crédits ECTS et validation des maquettes.",
  },
];

const benefits = [
  "Réduction de 80% du temps de planification",
  "Zéro conflit de salles et d'enseignants",
  "Suivi en temps réel de l'avancement pédagogique",
  "Export PDF automatisé des documents officiels",
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <Zap className="h-3.5 w-3.5 text-primary" />
          Plateforme de gestion académique
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Gérez votre département{" "}
          <span className="text-primary">universitaire</span> sans effort
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Emploi du temps, enseignants, examens, notes et présences — tout centralisé dans un seul outil pensé pour les chefs de département.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/login")} className="text-base px-8">
            Démarrer gratuitement
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            Découvrir les fonctionnalités
          </Button>
        </div>
      </section>

      {/* Benefits strip */}
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

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Une suite complète d'outils conçus spécifiquement pour la gestion des départements universitaires.
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

      {/* Roles */}
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
                desc: "Vision globale, validation des maquettes, gestion complète du département.",
                icon: Shield,
              },
              {
                role: "Assistant",
                desc: "Saisie des emplois du temps, gestion des présences et support opérationnel.",
                icon: ClipboardList,
              },
              {
                role: "Enseignant",
                desc: "Consultation de l'emploi du temps, saisie des disponibilités et des notes.",
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

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 md:py-28 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à simplifier votre gestion ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Rejoignez les départements qui ont déjà adopté Departo pour gagner en efficacité.
          </p>
          <Button size="lg" onClick={() => navigate("/login")} className="text-base px-10">
            Créer mon compte
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Departo</span>
          </div>
          <p>© {new Date().getFullYear()} Departo. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
