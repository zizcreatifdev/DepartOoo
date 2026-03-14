import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useHasValidatedMaquette } from "@/hooks/useHasValidatedMaquette";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, BookOpen, GraduationCap, TrendingUp, AlertTriangle,
  FileText, Calendar, Clock, ChevronRight, UserX, BookX, CalendarClock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const getCurrentAcademicYear = () => {
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
};

const durationHours = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
};

const ChefDashboard = () => {
  const { department } = useAuth();
  const { hasValidated, loading: maqLoading } = useHasValidatedMaquette();
  const navigate = useNavigate();
  const academicYear = getCurrentAcademicYear();

  const [loading, setLoading] = useState(true);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [seances, setSeances] = useState<any[]>([]);
  const [ues, setUes] = useState<any[]>([]);
  const [maquettes, setMaquettes] = useState<any[]>([]);
  const [examens, setExamens] = useState<any[]>([]);
  const [sujets, setSujets] = useState<any[]>([]);
  const [disponibilites, setDisponibilites] = useState<any[]>([]);
  const [perturbations, setPerturbations] = useState<any[]>([]);
  const [absenceSettings, setAbsenceSettings] = useState<any>(null);
  const [presences, setPresences] = useState<any[]>([]);

  useEffect(() => {
    if (!department?.id) return;
    const fetchAll = async () => {
      setLoading(true);
      const deptId = department.id;

      const [
        { data: ens }, { data: stu }, { data: sea },
        { data: maq }, { data: exa }, { data: suj },
        { data: dis }, { data: per }, { data: abs },
        { data: pre }
      ] = await Promise.all([
        supabase.from("enseignants").select("*").eq("department_id", deptId),
        supabase.from("students").select("*").eq("department_id", deptId).eq("is_active", true),
        supabase.from("seances").select("*").eq("department_id", deptId),
        supabase.from("maquettes").select("*, unites_enseignement(*)").eq("department_id", deptId).eq("academic_year", academicYear),
        supabase.from("examens").select("*, unites_enseignement(name)").eq("department_id", deptId).eq("academic_year", academicYear),
        supabase.from("examen_sujets").select("*, examens!inner(department_id, academic_year)").eq("examens.department_id", deptId),
        supabase.from("enseignant_disponibilites").select("enseignant_id"),
        supabase.from("perturbations").select("*").eq("department_id", deptId).eq("academic_year", academicYear),
        supabase.from("absence_settings").select("*").eq("department_id", deptId).maybeSingle(),
        supabase.from("presences").select("*, seances!inner(department_id, ue_id, type)").eq("seances.department_id", deptId),
      ]);

      setEnseignants(ens || []);
      setStudents(stu || []);
      setSeances(sea || []);
      setExamens(exa || []);
      setSujets(suj || []);
      setDisponibilites(dis || []);
      setPerturbations(per || []);
      setAbsenceSettings(abs);
      setPresences(pre || []);

      // Flatten UEs from maquettes
      const allUes = (maq || []).flatMap((m: any) => (m.unites_enseignement || []).map((u: any) => ({ ...u, maquette: m })));
      setUes(allUes);
      setMaquettes(maq || []);

      setLoading(false);
    };
    fetchAll();
  }, [department?.id]);

  // KPIs
  const activeEnseignants = enseignants.filter(e => e.is_active).length;
  const activeStudents = students.length;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const coursThisSemaine = seances.filter(s => {
    const d = parseISO(s.seance_date);
    return d >= weekStart && d <= weekEnd;
  }).length;

  // Quantum horaire
  const totalPlanned = ues.reduce((sum, ue) => sum + (ue.volume_cm || 0) + (ue.volume_td || 0) + (ue.volume_tp || 0), 0);
  const totalDone = seances.reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
  const quantumPct = totalPlanned > 0 ? Math.min(100, Math.round((totalDone / totalPlanned) * 100)) : 0;

  // Alerts
  const alerts = useMemo(() => {
    const items: { icon: React.ReactNode; text: string; action?: () => void; severity: "destructive" | "warning" | "info" }[] = [];

    // Sujets en retard
    const overdueSujets = (sujets || []).filter((s: any) => s.status === "en_attente" && s.deadline && isAfter(new Date(), parseISO(s.deadline)));
    if (overdueSujets.length > 0) {
      items.push({
        icon: <BookX className="h-4 w-4" />,
        text: `${overdueSujets.length} sujet(s) d'examen en retard de dépôt`,
        action: () => navigate("examens"),
        severity: "destructive",
      });
    }

    // Enseignants sans disponibilités
    const activeEns = enseignants.filter(e => e.is_active);
    const TOTAL_SLOTS = 18;
    const dispoCount: Record<string, number> = {};
    (disponibilites || []).forEach((d: any) => {
      dispoCount[d.enseignant_id] = (dispoCount[d.enseignant_id] || 0) + 1;
    });
    const ensWithoutDispo = activeEns.filter(e => (dispoCount[e.id] || 0) < TOTAL_SLOTS);
    if (ensWithoutDispo.length > 0) {
      items.push({
        icon: <UserX className="h-4 w-4" />,
        text: `${ensWithoutDispo.length} enseignant(s) n'ont pas renseigné toutes leurs disponibilités`,
        action: () => navigate("enseignants"),
        severity: "warning",
      });
    }

    // Perturbations actives
    const activePerturbations = (perturbations || []).filter((p: any) => isAfter(parseISO(p.end_date), new Date()));
    if (activePerturbations.length > 0) {
      items.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `${activePerturbations.length} perturbation(s) en cours ou à venir`,
        action: () => navigate("perturbations"),
        severity: "warning",
      });
    }

    return items;
  }, [sujets, enseignants, disponibilites, perturbations]);

  // UE Progress
  const ueProgress = useMemo(() => {
    return ues.map(ue => {
      const ueSeances = seances.filter(s => s.ue_id === ue.id);
      const done = ueSeances.reduce((sum, s) => sum + durationHours(s.start_time, s.end_time), 0);
      const planned = (ue.volume_cm || 0) + (ue.volume_td || 0) + (ue.volume_tp || 0);
      const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0;
      return { id: ue.id, name: ue.name, done: Math.round(done * 10) / 10, planned, pct };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [ues, seances]);

  // Prochains examens
  const prochExamens = useMemo(() => {
    return (examens || [])
      .filter((e: any) => isAfter(parseISO(e.exam_date), new Date()))
      .sort((a: any, b: any) => parseISO(a.exam_date).getTime() - parseISO(b.exam_date).getTime())
      .slice(0, 5);
  }, [examens]);

  const kpis = [
    { title: "Quantum horaire", value: `${quantumPct}%`, icon: TrendingUp, desc: "Heures planifiées vs maquette", progress: quantumPct },
    { title: "Étudiants actifs", value: activeStudents.toString(), icon: GraduationCap, desc: "Inscrits cette année" },
    { title: "Enseignants actifs", value: activeEnseignants.toString(), icon: Users, desc: "Enseignants en activité" },
    { title: "Cours cette semaine", value: coursThisSemaine.toString(), icon: Calendar, desc: `Semaine du ${format(weekStart, "d MMM", { locale: fr })}` },
  ];

  return (
    <DashboardLayout title="Tableau de bord — Chef de département">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold text-foreground">{department?.name || "Département"}</h3>
          <p className="text-muted-foreground">{department?.university || "Université"} — {academicYear}</p>
        </div>

        {/* Maquette warning */}
        {!maqLoading && !hasValidated && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 flex items-center gap-4 flex-wrap">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Maquette pédagogique non validée</p>
                <p className="text-sm text-muted-foreground">
                  Les autres modules sont bloqués tant qu'au moins une maquette n'est pas validée.
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard/chef/referentiel")}>
                <FileText className="h-4 w-4 mr-2" />
                Aller au Référentiel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map(kpi => (
              <Card key={kpi.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.desc}</p>
                  {kpi.progress !== undefined && (
                    <Progress value={kpi.progress} className="mt-2 h-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Alerts */}
        {!loading && alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Alertes prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className={alert.severity === "destructive" ? "text-destructive" : "text-warning"}>{alert.icon}</span>
                  <span className="flex-1 text-sm text-foreground">{alert.text}</span>
                  {alert.action && (
                    <Button variant="ghost" size="sm" onClick={alert.action}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* UE Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progression par UE</CardTitle>
              <CardDescription>Heures effectuées vs volume prévu dans la maquette</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : ueProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune UE configurée pour cette année.</p>
              ) : (
                ueProgress.slice(0, 8).map(ue => (
                  <div key={ue.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground truncate mr-2">{ue.name}</span>
                      <span className="text-muted-foreground shrink-0">{ue.done}h / {ue.planned}h</span>
                    </div>
                    <Progress value={ue.pct} className="h-2" />
                  </div>
                ))
              )}
              {ueProgress.length > 8 && (
                <Button variant="link" size="sm" className="px-0" onClick={() => navigate("/dashboard/chef/emploi-du-temps")}>
                  Voir toutes les UE →
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Prochains examens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prochains examens</CardTitle>
              <CardDescription>Les 5 prochains examens planifiés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : prochExamens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun examen à venir.</p>
              ) : (
                prochExamens.map((ex: any) => (
                  <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ex.unites_enseignement?.name || "UE"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ex.exam_date), "EEEE d MMMM yyyy", { locale: fr })} · {ex.start_time?.slice(0, 5)} - {ex.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {ex.session_type === "normale" ? "Normale" : "Rattrapage"}
                    </Badge>
                  </div>
                ))
              )}
              {prochExamens.length > 0 && (
                <Button variant="link" size="sm" className="px-0" onClick={() => navigate("/dashboard/chef/examens")}>
                  Voir tous les examens →
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                {seances.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    {seances.length} séances planifiées au total · {enseignants.length} enseignants enregistrés · {ues.length} UE configurées
                  </p>
                )}
                {seances.length === 0 && (
                  <p className="text-muted-foreground text-sm">Aucune activité pour le moment. Commencez par configurer le référentiel pédagogique.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ChefDashboard;
