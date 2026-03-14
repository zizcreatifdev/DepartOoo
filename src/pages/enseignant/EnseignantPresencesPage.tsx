import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PresenceSheet from "@/components/presences/PresenceSheet";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEnseignantProfile } from "@/hooks/useEnseignantProfile";

const EnseignantPresencesPage = () => {
  const { enseignant, loading: profileLoading } = useEnseignantProfile();
  const [students, setStudents] = useState<any[]>([]);
  const [seances, setSeances] = useState<any[]>([]);
  const [ues, setUes] = useState<any[]>([]);
  const [presences, setPresences] = useState<any[]>([]);
  const [perturbations, setPerturbations] = useState<any[]>([]);
  const [absenceSettings, setAbsenceSettings] = useState({ threshold_cm: 3, threshold_td: 3, threshold_tp: 3 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!enseignant) return;
    setLoading(true);
    const deptId = enseignant.department_id;

    const [sRes, seRes, ueRes, pRes, pertRes, setRes] = await Promise.all([
      supabase.from("students").select("*").eq("department_id", deptId).eq("is_active", true),
      supabase.from("seances").select("*").eq("enseignant_id", enseignant.id).order("seance_date", { ascending: false }),
      supabase.from("unites_enseignement").select("id, name, maquette_id"),
      supabase.from("presences").select("*"),
      supabase.from("perturbations").select("*").eq("department_id", deptId),
      supabase.from("absence_settings").select("*").eq("department_id", deptId).maybeSingle(),
    ]);

    setStudents(sRes.data || []);
    setSeances(seRes.data || []);
    setUes(ueRes.data || []);
    setPresences(pRes.data || []);
    setPerturbations(pertRes.data || []);
    if (setRes.data) {
      setAbsenceSettings({
        threshold_cm: setRes.data.threshold_cm,
        threshold_td: setRes.data.threshold_td,
        threshold_tp: setRes.data.threshold_tp,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [enseignant]);

  if (profileLoading || loading) {
    return (
      <DashboardLayout title="Mes listes de présence">
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </DashboardLayout>
    );
  }

  if (!enseignant) {
    return (
      <DashboardLayout title="Mes listes de présence">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Votre profil enseignant n'est pas encore configuré.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mes listes de présence">
      <PresenceSheet
        departmentId={enseignant.department_id}
        students={students}
        seances={seances}
        ues={ues}
        enseignants={[{ id: enseignant.id, first_name: enseignant.first_name, last_name: enseignant.last_name }]}
        allPresences={presences}
        absenceSettings={absenceSettings}
        perturbations={perturbations}
        canEdit={true}
        onRefresh={fetchData}
      />
    </DashboardLayout>
  );
};

export default EnseignantPresencesPage;
