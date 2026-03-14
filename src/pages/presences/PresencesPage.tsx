import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentsList from "@/components/presences/StudentsList";
import PresenceSheet from "@/components/presences/PresenceSheet";
import AbsenceDashboard from "@/components/presences/AbsenceDashboard";
import type { Student } from "@/components/presences/StudentsList";

interface AbsenceSettings {
  threshold_cm: number;
  threshold_td: number;
  threshold_tp: number;
}

const PresencesPage = () => {
  const { department, role } = useAuth();
  const canEdit = role === "chef" || role === "assistant";

  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [seances, setSeances] = useState<any[]>([]);
  const [ues, setUes] = useState<any[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [presences, setPresences] = useState<any[]>([]);
  const [perturbations, setPerturbations] = useState<any[]>([]);
  const [absenceSettings, setAbsenceSettings] = useState<AbsenceSettings>({ threshold_cm: 3, threshold_td: 3, threshold_tp: 3 });
  const [groups, setGroups] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);

    const [studRes, allStudRes, seancesRes, uesRes, ensRes, presRes, pertRes, settingsRes, levelsRes, effectifsRes] = await Promise.all([
      supabase.from("students").select("*").eq("department_id", department.id).eq("is_active", true).order("last_name"),
      supabase.from("students").select("*").eq("department_id", department.id).order("last_name"),
      supabase.from("seances").select("*").eq("department_id", department.id).order("seance_date", { ascending: false }),
      supabase.from("unites_enseignement")
        .select("id, name, maquette_id, volume_cm, volume_td, volume_tp, maquettes!inner(department_id)")
        .eq("maquettes.department_id", department.id),
      supabase.from("enseignants").select("id, first_name, last_name").eq("department_id", department.id).eq("is_active", true),
      supabase.from("presences").select("*"),
      supabase.from("perturbations").select("*").eq("department_id", department.id),
      supabase.from("absence_settings").select("*").eq("department_id", department.id).maybeSingle(),
      supabase.from("department_levels").select("level").eq("department_id", department.id),
      supabase.from("effectifs").select("group_name").eq("department_id", department.id),
    ]);

    setStudents((studRes.data as Student[]) || []);
    setAllStudents((allStudRes.data as Student[]) || []);
    setSeances(seancesRes.data || []);
    setUes((uesRes.data as any[])?.map(u => ({ id: u.id, name: u.name, maquette_id: u.maquette_id, volume_cm: u.volume_cm, volume_td: u.volume_td, volume_tp: u.volume_tp })) || []);
    setEnseignants(ensRes.data || []);
    setPresences(presRes.data || []);
    setPerturbations(pertRes.data || []);
    if (settingsRes.data) {
      setAbsenceSettings({
        threshold_cm: settingsRes.data.threshold_cm,
        threshold_td: settingsRes.data.threshold_td,
        threshold_tp: settingsRes.data.threshold_tp,
      });
    }
    setLevels((levelsRes.data || []).map((l: any) => l.level));
    const uniqueGroups = [...new Set((effectifsRes.data || []).map((e: any) => e.group_name))];
    setGroups(uniqueGroups.sort());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [department]);

  const cancelledSeanceIds = useMemo(() => {
    const ids = new Set<string>();
    seances.forEach(s => {
      const isCancelled = perturbations.some((p: any) => {
        if (s.seance_date < p.start_date || s.seance_date > p.end_date) return false;
        if (p.affected_groups?.length > 0 && !p.affected_groups.includes(s.group_name)) return false;
        return true;
      });
      if (isCancelled) ids.add(s.id);
    });
    return ids;
  }, [seances, perturbations]);

  if (loading) {
    return (
      <DashboardLayout title="Présences">
        <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Présences">
      <Tabs defaultValue="fiche" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fiche">Fiche de présence</TabsTrigger>
          <TabsTrigger value="absences">Tableau des absences</TabsTrigger>
          {canEdit && <TabsTrigger value="etudiants">Étudiants</TabsTrigger>}
        </TabsList>

        <TabsContent value="fiche">
          <PresenceSheet
            departmentId={department?.id || ""}
            students={students}
            seances={seances}
            ues={ues}
            enseignants={enseignants}
            allPresences={presences}
            absenceSettings={absenceSettings}
            perturbations={perturbations}
            canEdit={canEdit}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="absences">
          <AbsenceDashboard
            students={students}
            seances={seances}
            ues={ues}
            presences={presences}
            absenceSettings={absenceSettings}
            cancelledSeanceIds={cancelledSeanceIds}
          />
        </TabsContent>

        {canEdit && (
          <TabsContent value="etudiants">
            <StudentsList
              students={students}
              allStudents={allStudents}
              departmentId={department?.id || ""}
              groups={groups.length > 0 ? groups : ["Groupe unique"]}
              levels={levels.length > 0 ? levels : ["L1"]}
              isChef={role === "chef"}
              onRefresh={fetchData}
            />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default PresencesPage;
