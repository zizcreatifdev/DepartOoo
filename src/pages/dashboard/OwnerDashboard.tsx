import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge }    from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineTable } from '@/components/owner/PipelineTable';
import {
  Users, Building2, AlertTriangle, ChevronRight,
  BarChart3, Activity, FileText, CalendarDays,
  Zap, ShieldAlert, TrendingUp, LayoutGrid,
  CalendarClock, CreditCard, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  getStatsGlobales, getDepartementsInactifs, getAdoptionParModule,
  getPipelineCommercial, getAlertesOwner, getEvolutionInscriptions,
  getOffreDistribution,
} from '@/services/owner.service';
import { getLicencesExpirantBientot, getPaiementsEnRetard, marquerPaye } from '@/services/licences.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Helpers ──
function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-1"><Skeleton className="h-4 w-24" /></CardHeader>
      <CardContent><Skeleton className="h-8 w-16 mt-1" /><Skeleton className="h-3 w-32 mt-2" /></CardContent>
    </Card>
  );
}

// ============================================================
// Dashboard
// ============================================================

const OwnerDashboard = () => {

  // ---- Requêtes TanStack Query ----
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['owner-stats'],
    queryFn:  getStatsGlobales,
    staleTime: 60_000,
  });

  const { data: inactifs = [], isLoading: loadingInactifs } = useQuery({
    queryKey: ['owner-inactifs'],
    queryFn:  () => getDepartementsInactifs(21),
    staleTime: 60_000,
  });

  const { data: adoption = [], isLoading: loadingAdoption } = useQuery({
    queryKey: ['owner-adoption'],
    queryFn:  getAdoptionParModule,
    staleTime: 60_000,
  });

  const { data: pipeline = [], isLoading: loadingPipeline } = useQuery({
    queryKey: ['owner-pipeline'],
    queryFn:  getPipelineCommercial,
    staleTime: 30_000,
  });

  const { data: alertesOwner = [] } = useQuery({
    queryKey: ['owner-alertes'],
    queryFn:  getAlertesOwner,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: evolution = [] } = useQuery({
    queryKey: ['owner-evolution'],
    queryFn:  getEvolutionInscriptions,
    staleTime: 300_000,
  });

  const { data: offreDistrib = [] } = useQuery({
    queryKey: ['owner-offre-distrib'],
    queryFn:  getOffreDistribution,
    staleTime: 60_000,
  });

  const { data: licencesExpirantes = [] } = useQuery({
    queryKey: ['owner-dashboard-licences'],
    queryFn:  () => getLicencesExpirantBientot(60),
    staleTime: 60_000,
  });

  const { data: paiementsEnRetard = [] } = useQuery({
    queryKey: ['owner-dashboard-paiements'],
    queryFn:  getPaiementsEnRetard,
    staleTime: 30_000,
  });

  const qc = useQueryClient();
  const navigate = useNavigate();

  const payerMutation = useMutation({
    mutationFn: (id: string) => marquerPaye(id),
    onSuccess: () => {
      toast.success('Paiement marqué comme reçu ✓');
      qc.invalidateQueries({ queryKey: ['owner-dashboard-paiements'] });
      qc.invalidateQueries({ queryKey: ['owner-paiements'] });
    },
    onError: (e: any) => toast.error('Erreur : ' + e.message),
  });

  // ---- Calculs pipeline ----
  const pipelineStats = {
    discussion: pipeline.filter(p => p.statut === 'discussion').length,
    demo:       pipeline.filter(p => p.statut === 'demo').length,
    essai:      pipeline.filter(p => p.statut === 'essai').length,
    converti:   pipeline.filter(p => p.statut === 'converti').length,
  };
  const totalLicenses = offreDistrib.reduce((s, p) => s + p.value, 0);

  return (
    <DashboardLayout title="Administration — Departo">
      <div className="space-y-6">

        {/* ══════════ ALERTES ══════════ */}
        {alertesOwner.length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Alertes intelligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertesOwner.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/80">
                  <span className={
                    a.severity === 'destructive' ? 'text-destructive' :
                    a.severity === 'warning'     ? 'text-orange-500'  : 'text-blue-500'
                  }>
                    {a.severity === 'info' ? <Zap className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  </span>
                  <span className="flex-1 text-sm text-foreground">{a.text}</span>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ══════════ STATS GLOBALES ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" /> Vue d'ensemble
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loadingStats ? (
              <>{[0,1,2,3].map(i => <StatSkeleton key={i} />)}</>
            ) : (
              <>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Départements actifs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {stats?.nb_departements_actifs ?? '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Onboarding complété</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Enseignants actifs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.nb_enseignants_total ?? '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">Tous départements</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> Séances ce mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.nb_seances_ce_mois ?? '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">Créées ce mois-ci</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Documents générés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.nb_documents_generes ?? '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">Ce mois-ci</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* ══════════ CROISSANCE ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Croissance
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Évolution inscriptions (données réelles) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Évolution des inscriptions</CardTitle>
                <CardDescription>Nouveaux départements par mois</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {evolution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(v: number) => [v, 'Nouveaux depts']}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Répartition par offre — données réelles departments.offre */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition par offre</CardTitle>
                <CardDescription>
                  {totalLicenses > 0
                    ? `${totalLicenses} département${totalLicenses > 1 ? 's' : ''} actif${totalLicenses > 1 ? 's' : ''}`
                    : 'Aucun département actif'}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                {offreDistrib.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={offreDistrib} cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80} dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                      >
                        {offreDistrib.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════ LICENCES & PAIEMENTS ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Licences & Paiements
            <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => navigate('/dashboard/owner/licences')}>
              Gérer →
            </Button>
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Licences expirant bientôt */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Licences expirant bientôt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {licencesExpirantes.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Toutes les licences sont valides
                  </p>
                ) : licencesExpirantes.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                    <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.university && `${l.university} · `}
                        {l.offre.charAt(0).toUpperCase() + l.offre.slice(1)}
                      </p>
                    </div>
                    <Badge variant={l.jours_restants !== null && l.jours_restants <= 14 ? 'destructive' : l.jours_restants !== null && l.jours_restants <= 30 ? 'secondary' : 'outline'}>
                      {l.jours_restants !== null ? `${l.jours_restants}j` : '—'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Paiements en retard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Paiements en retard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {paiementsEnRetard.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Aucun paiement en retard
                  </p>
                ) : paiementsEnRetard.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5">
                    <CreditCard className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.department_name}</p>
                      <p className="text-xs text-destructive">
                        {p.montant.toLocaleString('fr-FR')} FCFA · échéance {new Date(p.date_echeance).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs text-emerald-600 hover:text-emerald-700 shrink-0"
                      disabled={payerMutation.isPending}
                      onClick={() => payerMutation.mutate(p.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Payé
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════ ACQUISITION — PIPELINE ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Acquisition
          </h3>

          {/* KPIs pipeline */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            {([
              { label: 'En discussion', value: pipelineStats.discussion, color: 'bg-amber-400' },
              { label: 'En démo',       value: pipelineStats.demo,       color: 'bg-blue-400' },
              { label: 'En essai',      value: pipelineStats.essai,      color: 'bg-purple-400' },
              { label: 'Convertis',     value: pipelineStats.converti,   color: 'bg-emerald-400' },
            ] as const).map(p => (
              <Card key={p.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{p.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{p.value}</div>
                  <div className="h-1.5 rounded-full bg-muted mt-2">
                    <div
                      className={`h-full rounded-full ${p.color}`}
                      style={{ width: `${Math.min(100, p.value * 12)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tableau pipeline complet */}
          <PipelineTable entries={pipeline} isLoading={loadingPipeline} />
        </div>

        {/* ══════════ SANTÉ DES COMPTES ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" /> Santé des comptes
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Adoption par module */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adoption par module</CardTitle>
                <CardDescription>Départements actifs ce mois-ci par module</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingAdoption ? (
                  [0,1,2,3].map(i => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-8" /></div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))
                ) : adoption.map(m => (
                  <div key={m.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{m.name}</span>
                      <span className="text-muted-foreground">
                        {m.nb_depts}/{m.total_depts} depts ({m.taux}%)
                      </span>
                    </div>
                    <Progress value={m.taux} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Départements inactifs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Liste rouge
                </CardTitle>
                <CardDescription>Inactifs depuis plus de 21 jours (aucune séance)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingInactifs ? (
                  [0,1,2].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : inactifs.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium">
                    ✓ Tous les départements sont actifs
                  </p>
                ) : inactifs.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5">
                    <Building2 className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.university}</p>
                    </div>
                    <Badge variant="destructive">{d.jours_inactif}j</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════ USAGE PRODUIT ══════════ */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Usage produit
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">

            {/* BarChart adoption */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adoption par module (BarChart)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {loadingAdoption ? (
                  <div className="h-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adoption} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        type="number" allowDecimals={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        domain={[0, 'dataMax']}
                      />
                      <YAxis
                        dataKey="name" type="category" width={120}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(v: number, _, props) => [
                          `${v} / ${props.payload?.total_depts} depts`,
                          'Utilisation',
                        ]}
                      />
                      <Bar dataKey="nb_depts" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activité ce mois */}
            <Card>
              <CardHeader><CardTitle className="text-base">Activité ce mois</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {loadingStats ? (
                  [0,1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : (
                  <>
                    {[
                      { label: 'Séances créées',       value: stats?.nb_seances_ce_mois  ?? 0, icon: <CalendarDays className="h-4 w-4 text-muted-foreground" /> },
                      { label: 'Documents générés',     value: stats?.nb_documents_generes ?? 0, icon: <FileText     className="h-4 w-4 text-muted-foreground" /> },
                      { label: 'Enseignants actifs',    value: stats?.nb_enseignants_total ?? 0, icon: <Users        className="h-4 w-4 text-muted-foreground" /> },
                      { label: 'Départements onboardés',value: stats?.nb_departements_actifs ?? 0, icon: <Building2  className="h-4 w-4 text-muted-foreground" /> },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        {item.icon}
                        <span className="flex-1 text-sm text-foreground">{item.label}</span>
                        <span className="text-lg font-bold text-foreground">{item.value}</span>
                      </div>
                    ))}
                    <div className="pt-1 text-xs text-muted-foreground text-right">
                      Données en temps réel — rafraîchissement automatique
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
