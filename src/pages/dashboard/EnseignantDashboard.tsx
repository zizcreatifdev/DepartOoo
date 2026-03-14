import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Clock, ClipboardList, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnseignantProfile } from "@/hooks/useEnseignantProfile";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { fr } from "date-fns/locale";

const EnseignantDashboard = () => {
  const { enseignant, loading } = useEnseignantProfile();
  const navigate = useNavigate();
  const [nextSeances, setNextSeances] = useState<any[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [ueNames, setUeNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enseignant) return;
    const fetchDashboard = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const [seancesRes, allRes, ueRes] = await Promise.all([
        supabase.from("seances").select("*")
          .eq("enseignant_id", enseignant.id)
          .gte("seance_date", today)
          .lte("seance_date", weekEnd)
          .order("seance_date")
          .order("start_time")
          .limit(5),
        supabase.from("seances").select("start_time, end_time")
          .eq("enseignant_id", enseignant.id),
        supabase.from("unites_enseignement").select("id, name"),
      ]);

      setNextSeances(seancesRes.data || []);
      setUeNames(new Map((ueRes.data || []).map(u => [u.id, u.name])));

      // Calculate total hours
      const hours = (allRes.data || []).reduce((sum, s) => {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        return sum + (eh * 60 + em - sh * 60 - sm) / 60;
      }, 0);
      setTotalHours(hours);
    };
    fetchDashboard();
  }, [enseignant]);

  if (loading) {
    return (
      <DashboardLayout title="Tableau de bord">
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </DashboardLayout>
    );
  }

  if (!enseignant) {
    return (
      <DashboardLayout title="Tableau de bord">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Votre profil enseignant n'est pas encore configuré. Contactez votre chef de département.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const quota = enseignant.type === "permanent" ? enseignant.quota_hours : enseignant.allocated_hours;
  const progressPct = quota > 0 ? Math.min((totalHours / quota) * 100, 100) : 0;

  return (
    <DashboardLayout title="Tableau de bord">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Bonjour, {enseignant.first_name} {enseignant.last_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {enseignant.type === "permanent" ? "Enseignant permanent" : "Vacataire"}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/enseignant/emploi-du-temps")}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prochains cours</p>
                    <p className="text-lg font-bold">{nextSeances.length}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/enseignant/heures")}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Heures effectuées</p>
                    <p className="text-lg font-bold">{totalHours.toFixed(0)}h / {quota}h</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/enseignant/presences")}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Présences</p>
                  <p className="text-sm font-medium">Gérer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/enseignant/sujets")}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sujets</p>
                  <p className="text-sm font-medium">Déposer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hours progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progression des heures</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPct} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {totalHours.toFixed(1)}h effectuées sur {quota}h {enseignant.type === "permanent" ? "statutaires" : "allouées"}
            </p>
          </CardContent>
        </Card>

        {/* Upcoming seances */}
        {nextSeances.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prochains cours (7 jours)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextSeances.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <Badge variant="outline" className="text-xs shrink-0">{s.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ueNames.get(s.ue_id) || "UE"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.seance_date), "EEEE d MMM", { locale: fr })} · {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)} · {s.group_name}
                    </p>
                  </div>
                  {s.is_online && s.online_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={s.online_link} target="_blank" rel="noopener noreferrer">Rejoindre</a>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnseignantDashboard;
