import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, CalendarDays, Users, ClipboardList, BookOpen,
  BarChart3, ArrowRight, CheckCircle2, Shield, Zap, FileText,
  Bell, Building2, Mail, Star, ChevronDown,
} from "lucide-react";

/* ── Données ─────────────────────────────────────────────── */

const features = [
  { icon: CalendarDays, title: "Emploi du temps intelligent",   desc: "Détection automatique des conflits de salles et d'enseignants." },
  { icon: Users,        title: "Gestion des enseignants",        desc: "Disponibilités, quotas horaires et invitations par email." },
  { icon: ClipboardList,title: "Présences & Absences",           desc: "Alertes de dépassement de seuil et historique complet." },
  { icon: BookOpen,     title: "Notes & Résultats",              desc: "Import Excel, moyennes pondérées, export PDF." },
  { icon: GraduationCap,title: "Examens",                        desc: "Planification, salles, surveillants et sujets." },
  { icon: BarChart3,    title: "Référentiel & Maquettes",        desc: "UE, coefficients, crédits ECTS et validation." },
  { icon: FileText,     title: "Documents PDF automatisés",      desc: "Emplois du temps et relevés avec le logo de votre université." },
  { icon: Bell,         title: "Alertes en temps réel",          desc: "Absences critiques, perturbations, documents obsolètes." },
  { icon: Building2,    title: "Multi-universités",              desc: "Logo officiel de chaque université sur tous les documents." },
];

const roles = [
  { icon: Shield,       label: "Chef de département", color: "bg-blue-500/10 text-blue-600",   desc: "Vision globale, validation des maquettes, gestion complète." },
  { icon: ClipboardList,label: "Assistant",            color: "bg-violet-500/10 text-violet-600", desc: "Emplois du temps, présences, invitations enseignants." },
  { icon: BookOpen,     label: "Enseignant",           color: "bg-emerald-500/10 text-emerald-600", desc: "Emploi du temps, disponibilités, notes et sujets." },
];

const plans = [
  {
    name: "Starter",
    price: "Gratuit",
    period: "· 1 mois d'essai",
    desc: "Accès complet pendant 30 jours, sans carte bancaire",
    badge: null,
    highlight: false,
    features: [
      "1 assistant de département",
      "30 enseignants maximum",
      "Toutes les fonctionnalités incluses",
      "Export PDF & Excel",
      "Logo université sur les documents",
      "Support par email",
    ],
    note: "Après 30 jours, les fonctionnalités se verrouillent jusqu'à souscription.",
    cta: "Commencer gratuitement",
    action: "login",
  },
  {
    name: "Pro",
    price: "Sur devis",
    period: "",
    desc: "Pour les départements qui veulent continuer après l'essai",
    badge: "Populaire",
    highlight: true,
    features: [
      "2 assistants de département",
      "60 enseignants maximum",
      "Toutes les fonctionnalités illimitées",
      "Notifications WhatsApp",
      "Renouvellement annuel ou mensuel",
      "Support prioritaire",
    ],
    note: null,
    cta: "Je suis intéressé",
    action: "contact",
  },
  {
    name: "Université",
    price: "Sur devis",
    period: "",
    desc: "Pour les établissements multi-départements",
    badge: null,
    highlight: false,
    features: [
      "Assistants & enseignants illimités",
      "Tous les départements de l'université",
      "Dashboard centralisé",
      "Accompagnement & formations",
      "Intégration systèmes existants",
      "Compte dédié",
    ],
    note: null,
    cta: "Nous contacter",
    action: "contact",
  },
];

/* ── Composant ───────────────────────────────────────────── */

const LandingPage = () => {
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    if (action === "contact") {
      window.location.href = "mailto:contact@departo.app";
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 max-w-6xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Departo</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="mailto:contact@departo.app" className="hover:text-foreground transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Connexion</Button>
            <Button size="sm" onClick={() => navigate("/login")}>
              Démarrer <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-44 md:pb-32">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute -top-40 -right-40 -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-[300px] w-[300px] rounded-full bg-primary/8 blur-2xl" />

        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
            <Zap className="h-3.5 w-3.5" />
            Conçu pour les universités d'Afrique de l'Ouest
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Gérez votre{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">département</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-primary/15 -z-0 rounded" />
            </span>
            <br />
            sans effort
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Emploi du temps, enseignants, examens, notes, présences —
            <strong className="text-foreground font-medium"> tout en un seul endroit</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button size="lg" className="text-base px-8 h-12 shadow-lg shadow-primary/25" onClick={() => navigate("/login")}>
              Essayer gratuitement — 30 jours
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              Voir les fonctionnalités
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {[
              { icon: Star,          text: "Aucune carte bancaire" },
              { icon: Zap,           text: "Mise en place en 10 min" },
              { icon: Shield,        text: "Données hébergées en sécurité" },
              { icon: Building2,     text: "7 universités sénégalaises incluses" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Une suite complète d'outils pensés pour la réalité des universités africaines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                {i === 0 && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Populaire</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ──────────────────────────────────────────── */}
      <section className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Rôles</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Un espace pour chaque rôle</h2>
            <p className="text-muted-foreground">Chaque utilisateur accède à un dashboard taillé pour ses responsabilités.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {roles.map((r) => (
              <div key={r.label} className="rounded-2xl border bg-card p-6 text-center hover:shadow-md transition-shadow">
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${r.color} mb-4`}>
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base mb-2">{r.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Tarifs</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple et transparent</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Commencez gratuitement. Continuez quand vous êtes convaincus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-7 flex flex-col transition-all ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary/30 scale-[1.02]"
                    : "border-border/60 bg-card hover:border-primary/30 hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-0.5 text-xs shadow-sm">{plan.badge}</Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.note && (
                  <p className="text-xs text-muted-foreground italic border-t pt-4 mb-5">
                    {plan.note}
                  </p>
                )}

                <Button
                  className="w-full h-11"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleAction(plan.action)}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1),_transparent_60%)]" />
        <div className="relative container mx-auto px-4 max-w-4xl py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Prêt à moderniser<br />votre département ?
          </h2>
          <p className="text-primary-foreground/75 text-lg mb-10 max-w-lg mx-auto">
            Rejoignez les premiers départements qui ont adopté Departo.
            Configuration en moins de 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="h-12 px-10 text-base font-semibold"
              onClick={() => navigate("/login")}
            >
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 text-primary-foreground hover:text-primary-foreground hover:bg-white/10"
              onClick={() => { window.location.href = "mailto:contact@departo.app"; }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Nous écrire
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 max-w-6xl py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Departo</span>
            <span>— Gestion académique pour l'Afrique</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="mailto:contact@departo.app" className="hover:text-foreground transition-colors">
              contact@departo.app
            </a>
            <span>© {new Date().getFullYear()} Departo</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
