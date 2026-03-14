import { useState, useEffect, useMemo } from "react";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import WeekCalendar from "@/components/emploi-du-temps/WeekCalendar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEnseignantProfile } from "@/hooks/useEnseignantProfile";
import { Card, CardContent } from "@/components/ui/card";

const EnseignantEmploiDuTempsPage = () => {
  const { enseignant, loading: profileLoading } = useEnseignantProfile();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [seances, setSeances] = useState<any[]>([]);
  const [ues, setUes] = useState<any[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [salles, setSalles] = useState<any[]>([]);
  const [perturbations, setPerturbations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = useMemo(() => addWeeks(weekStart, 1), [weekStart]);
  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} — ${format(addWeeks(weekStart, 0.9), "d MMM yyyy", { locale: fr })}`;

  useEffect(() => {
    if (!enseignant) return;
    const fetchAll = async () => {
      setLoading(true);
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");

      const [sRes, ueRes, ensRes, salRes, pertRes] = await Promise.all([
        supabase.from("seances").select("*")
          .eq("enseignant_id", enseignant.id)
          .gte("seance_date", startStr)
          .lt("seance_date", endStr),
        supabase.from("unites_enseignement").select("id, name, maquette_id"),
        supabase.from("enseignants").select("id, first_name, last_name").eq("id", enseignant.id),
        supabase.from("salles").select("id, name, type, capacity").eq("department_id", enseignant.department_id),
        supabase.from("perturbations").select("*").eq("department_id", enseignant.department_id),
      ]);

      setSeances(sRes.data || []);
      setUes(ueRes.data || []);
      setEnseignants(ensRes.data || []);
      setSalles(salRes.data || []);
      setPerturbations(pertRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [enseignant, weekStart, weekEnd]);

  if (profileLoading) {
    return (
      <DashboardLayout title="Mon emploi du temps">
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </DashboardLayout>
    );
  }

  if (!enseignant) {
    return (
      <DashboardLayout title="Mon emploi du temps">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Votre profil enseignant n'est pas encore configuré.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mon emploi du temps">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(s => subWeeks(s, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(s => addWeeks(s, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Aujourd'hui
          </Button>
        </div>

        <WeekCalendar
          seances={seances}
          ues={ues}
          enseignants={enseignants}
          salles={salles}
          weekStart={weekStart}
          loading={loading}
          perturbations={perturbations}
        />
      </div>
    </DashboardLayout>
  );
};

export default EnseignantEmploiDuTempsPage;
