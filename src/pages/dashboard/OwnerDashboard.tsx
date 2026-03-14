import { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, Users, Building2, AlertTriangle,
  CreditCard, ChevronRight, BarChart3, Activity, MapPin,
  CalendarClock, FileText, ClipboardList, CalendarDays, Zap, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

// ── Mock data (à remplacer par de vraies données backend) ──

const mrrData = [
  { month: "Sep", mrr: 12000 }, { month: "Oct", mrr: 14500 }, { month: "Nov", mrr: 16200 },
  { month: "Dec", mrr: 17800 }, { month: "Jan", mrr: 19500 }, { month: "Fév", mrr: 21300 },
  { month: "Mar", mrr: 23100 },
];

const planDistribution = [
  { name: "Starter", value: 18, color: "hsl(var(--chart-1))" },
  { name: "Pro", value: 42, color: "hsl(var(--chart-2))" },
  { name: "Université", value: 12, color: "hsl(var(--chart-3))" },
];

const moduleUsage = [
  { name: "Emploi du temps", count: 342 },
  { name: "Présences", count: 289 },
  { name: "Notes", count: 198 },
  { name: "Examens", count: 156 },
  { name: "Perturbations", count: 87 },
  { name: "Documents", count: 64 },
];

const expiringLicenses = [
  { dept: "Info — Univ. Yaoundé I", plan: "Pro", daysLeft: 12 },
  { dept: "Maths — Univ. Douala", plan: "Starter", daysLeft: 28 },
  { dept: "Physique — Univ. Dschang", plan: "Pro", daysLeft: 45 },
  { dept: "Chimie — Univ. Maroua", plan: "Université", daysLeft: 72 },
];

const latePayments = [
  { dept: "Génie Civil — Univ. Ngaoundéré", amount: 150000, daysPast: 15 },
  { dept: "SVT — Univ. Bamenda", amount: 75000, daysPast: 7 },
];

const pipeline = [
  { stage: "En discussion", count: 8, color: "hsl(var(--chart-4))" },
  { stage: "En démo", count: 5, color: "hsl(var(--chart-1))" },
  { stage: "En essai", count: 12, color: "hsl(var(--chart-2))" },
  { stage: "Convertis", count: 3, color: "hsl(var(--chart-3))" },
];

const inactiveDepts = [
  { name: "Lettres — Univ. Buea", lastActive: "11 Fév 2026", days: 20 },
  { name: "Histoire — Univ. Ebolowa", lastActive: "3 Fév 2026", days: 28 },
  { name: "Philosophie — Univ. Bertoua", lastActive: "25 Jan 2026", days: 37 },
];

const alerts = [
  { text: "2 licences expirent dans moins de 15 jours sans renouvellement", severity: "destructive" as const, icon: <CreditCard className="h-4 w-4" /> },
  { text: "3 départements inactifs depuis plus de 21 jours", severity: "warning" as const, icon: <ShieldAlert className="h-4 w-4" /> },
  { text: "2 paiements en retard pour un total de 225 000 FCFA", severity: "destructive" as const, icon: <AlertTriangle className="h-4 w-4" /> },
  { text: "1 département bloqué à l'étape d'onboarding", severity: "info" as const, icon: <Zap className="h-4 w-4" /> },
];

const adoptionRates = [
  { module: "Référentiel", rate: 95 },
  { module: "Emploi du temps", rate: 88 },
  { module: "Présences", rate: 72 },
  { module: "Enseignants", rate: 85 },
  { module: "Examens", rate: 61 },
  { module: "Notes", rate: 45 },
  { module: "Documents", rate: 38 },
];

const OwnerDashboard = () => {
  const arrTotal = 23100 * 12;
  const totalLicenses = planDistribution.reduce((s, p) => s + p.value, 0);
  const conversionRate = Math.round((3 / 12) * 100);

  return (
    <DashboardLayout title="Administration — Departo">
      <div className="space-y-6">
        {/* ── Alertes intelligentes ── */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertes intelligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/80">
                <span className={
                  a.severity === "destructive" ? "text-destructive" :
                  a.severity === "warning" ? "text-orange-500" : "text-blue-500"
                }>{a.icon}</span>
                <span className="flex-1 text-sm text-foreground">{a.text}</span>
                <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ══════════ SECTION REVENUS ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Revenus
          </h3>

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">ARR Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{(arrTotal).toLocaleString("fr-FR")} FCFA</div>
                <p className="text-xs text-muted-foreground mt-1">Revenu annuel récurrent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">23 100 FCFA</div>
                <p className="text-xs text-green-600">+9.2% vs mois précédent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">Licences actives</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalLicenses}</div>
                <p className="text-xs text-muted-foreground">départements abonnés</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">Paiements en retard</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{latePayments.length}</div>
                <p className="text-xs text-muted-foreground">225 000 FCFA en souffrance</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* MRR Line Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Évolution du MRR</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mrrData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Répartition par offre</CardTitle></CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                      {planDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Expiring licenses & late payments */}
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Licences expirant bientôt</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {expiringLicenses.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                    <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{l.dept}</p>
                      <p className="text-xs text-muted-foreground">{l.plan}</p>
                    </div>
                    <Badge variant={l.daysLeft <= 30 ? "destructive" : l.daysLeft <= 60 ? "secondary" : "outline"}>
                      {l.daysLeft}j
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Paiements en retard</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {latePayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun paiement en retard.</p>
                ) : latePayments.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5">
                    <CreditCard className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.dept}</p>
                      <p className="text-xs text-destructive">{p.amount.toLocaleString("fr-FR")} FCFA · {p.daysPast} jours de retard</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════ SECTION ACQUISITION ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Acquisition
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            {pipeline.map((p) => (
              <Card key={p.stage}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{p.stage}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{p.count}</div>
                  <div className="h-1.5 rounded-full mt-2" style={{ backgroundColor: p.color, opacity: 0.3 }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: p.color, width: `${Math.min(100, p.count * 8)}%` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Taux de conversion</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-6">
                <div>
                  <div className="text-4xl font-bold text-primary">{conversionRate}%</div>
                  <p className="text-sm text-muted-foreground mt-1">Essai → Payant</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">En essai</span><span className="font-medium text-foreground">12</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Convertis ce mois</span><span className="font-medium text-foreground">3</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Désistements</span><span className="font-medium text-foreground">1</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Couverture universitaire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {["Yaoundé I", "Douala", "Dschang", "Ngaoundéré", "Maroua", "Buea"].map((u) => (
                    <div key={u} className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-foreground">{u}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">6 universités sur 11 — couverture 55%</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════ SECTION SANTÉ DES COMPTES ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" /> Santé des comptes
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Taux d'adoption par module</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {adoptionRates.map((m) => (
                  <div key={m.module} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{m.module}</span>
                      <span className="text-muted-foreground">{m.rate}%</span>
                    </div>
                    <Progress value={m.rate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Liste rouge — Départements inactifs
                </CardTitle>
                <CardDescription>Inactifs depuis plus de 21 jours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {inactiveDepts.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5">
                    <Building2 className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">Dernière activité : {d.lastActive}</p>
                    </div>
                    <Badge variant="destructive">{d.days}j</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════ SECTION USAGE PRODUIT ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Usage produit
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Modules les plus utilisés</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleUsage} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={110} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Activité ce mois</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Emplois du temps générés", value: 47, icon: <CalendarDays className="h-4 w-4 text-muted-foreground" /> },
                  { label: "Imports Excel effectués", value: 23, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
                  { label: "Listes de présence envoyées", value: 156, icon: <ClipboardList className="h-4 w-4 text-muted-foreground" /> },
                  { label: "Documents générés", value: 89, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
                  { label: "Examens planifiés", value: 34, icon: <CalendarClock className="h-4 w-4 text-muted-foreground" /> },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {item.icon}
                    <span className="flex-1 text-sm text-foreground">{item.label}</span>
                    <span className="text-lg font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
