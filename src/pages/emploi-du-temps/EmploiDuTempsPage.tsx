import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Filter, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import SeanceFormDialog from "@/components/emploi-du-temps/SeanceFormDialog";
import WeekCalendar from "@/components/emploi-du-temps/WeekCalendar";
import UeProgressList from "@/components/emploi-du-temps/UeProgressList";
import EmploiDuTempsFilters from "@/components/emploi-du-temps/EmploiDuTempsFilters";
import ResponsablesList from "@/components/emploi-du-temps/ResponsablesList";
import { exportPDF, exportExcel } from "@/components/emploi-du-temps/exportUtils";
import { getUniversity } from "@/services/universities.service";
import type { ResponsableClasse } from "@/components/emploi-du-temps/ResponsableFormDialog";
import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface Seance {
  id: string;
  department_id: string;
  ue_id: string;
  enseignant_id: string;
  salle_id: string | null;
  type: "CM" | "TD" | "TP" | "rattrapage";
  group_name: string;
  seance_date: string;
  start_time: string;
  end_time: string;
  is_online: boolean;
  online_link: string | null;
  notes: string | null;
  created_by: string | null;
  /** Marqueur DB : séance annulée suite à une perturbation */
  is_cancelled?: boolean;
}

export interface UeInfo {
  id: string;
  name: string;
  maquette_id: string;
  volume_cm: number;
  volume_td: number;
  volume_tp: number;
}

export interface EnseignantInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

export interface SalleInfo {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export interface EffectifInfo {
  id: string;
  level: string;
  group_name: string;
  student_count: number;
}

const EmploiDuTempsPage = () => {
  const { department, role } = useAuth();
  const [seances, setSeances] = useState<Seance[]>([]);
  const [ues, setUes] = useState<UeInfo[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantInfo[]>([]);
  const [salles, setSalles] = useState<SalleInfo[]>([]);
  const [effectifs, setEffectifs] = useState<EffectifInfo[]>([]);
  const [responsables, setResponsables] = useState<ResponsableClasse[]>([]);
  const [perturbations, setPerturbations] = useState<Perturbation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeance, setEditingSeance] = useState<Seance | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterEnseignant, setFilterEnseignant] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [universityLogoUrl, setUniversityLogoUrl] = useState<string | null>(null);

  // Charger le logo de l'université dès que department.university_id est disponible
  useEffect(() => {
    const uid = (department as any)?.university_id;
    if (!uid) { setUniversityLogoUrl(null); return; }
    getUniversity(uid)
      .then((u) => setUniversityLogoUrl(u.logo_url))
      .catch(() => setUniversityLogoUrl(null));
  }, [(department as any)?.university_id]);

  const canEdit = role === "chef" || role === "assistant";

  const fetchAll = async () => {
    if (!department) return;
    setLoading(true);

    const weekEnd = addDays(currentWeekStart, 6);
    const startStr = format(currentWeekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");

    const [seancesRes, uesRes, ensRes, sallesRes, effectifsRes, respRes, pertRes] = await Promise.all([
      supabase.from("seances").select("*").eq("department_id", department.id)
        .gte("seance_date", startStr).lte("seance_date", endStr).order("seance_date").order("start_time"),
      supabase.from("unites_enseignement")
        .select("id, name, maquette_id, volume_cm, volume_td, volume_tp, maquettes!inner(department_id)")
        .eq("maquettes.department_id", department.id),
      supabase.from("enseignants").select("id, first_name, last_name, email, is_active")
        .eq("department_id", department.id).eq("is_active", true).order("last_name"),
      supabase.from("salles").select("id, name, type, capacity")
        .eq("department_id", department.id).order("name"),
      supabase.from("effectifs").select("id, level, group_name, student_count")
        .eq("department_id", department.id),
      supabase.from("responsables_classe").select("*")
        .eq("department_id", department.id),
      supabase.from("perturbations").select("*")
        .eq("department_id", department.id),
    ]);

    setSeances((seancesRes.data as Seance[]) || []);
    setUes((uesRes.data as any[])?.map(u => ({ id: u.id, name: u.name, maquette_id: u.maquette_id, volume_cm: u.volume_cm, volume_td: u.volume_td, volume_tp: u.volume_tp })) || []);
    setEnseignants((ensRes.data as EnseignantInfo[]) || []);
    setSalles((sallesRes.data as SalleInfo[]) || []);
    setEffectifs((effectifsRes.data as EffectifInfo[]) || []);
    setResponsables((respRes.data as ResponsableClasse[]) || []);
    setPerturbations((pertRes.data as Perturbation[]) || []);
    setLoading(false);
  };

  const [allSeances, setAllSeances] = useState<Seance[]>([]);
  const fetchAllSeances = async () => {
    if (!department) return;
    const { data } = await supabase.from("seances").select("*").eq("department_id", department.id);
    setAllSeances((data as Seance[]) || []);
  };

  useEffect(() => { fetchAll(); fetchAllSeances(); }, [department, currentWeekStart]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("seances").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Séance supprimée");
    fetchAll(); fetchAllSeances();
  };

  const handleEdit = (seance: Seance) => { setEditingSeance(seance); setDialogOpen(true); };
  const handleAdd = () => { setEditingSeance(null); setDialogOpen(true); };

  const filteredSeances = useMemo(() => {
    let result = seances;
    if (filterEnseignant !== "all") result = result.filter(s => s.enseignant_id === filterEnseignant);
    if (filterGroup !== "all") result = result.filter(s => s.group_name === filterGroup);
    return result;
  }, [seances, filterEnseignant, filterGroup]);

  const weekLabel = useMemo(() => {
    const end = addDays(currentWeekStart, 5);
    return `${format(currentWeekStart, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
  }, [currentWeekStart]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set(seances.map(s => s.group_name));
    effectifs.forEach(e => groups.add(e.group_name));
    return Array.from(groups).sort();
  }, [seances, effectifs]);

  const handleExportPDF = async () => {
    await exportPDF({
      seances: filteredSeances,
      ues, enseignants, salles,
      weekStart: currentWeekStart,
      departmentName: department?.name || "",
      universityName: (department as any)?.university || "",
      responsables,
      filterGroup,
      logoUrl: universityLogoUrl ?? undefined,
    });
    toast.success("PDF exporté");
  };

  const handleExportExcel = () => {
    exportExcel({
      seances: filteredSeances,
      ues, enseignants, salles,
      weekStart: currentWeekStart,
      departmentName: department?.name || "",
      universityName: department?.university || "",
    });
    toast.success("Excel exporté");
  };

  return (
    <DashboardLayout title="Emploi du temps">
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="progression">Progression UE</TabsTrigger>
          <TabsTrigger value="responsables">Responsables</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(w => subWeeks(w, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm min-w-[200px] text-center">{weekLabel}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(w => addWeeks(w, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Aujourd'hui
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-1" /> Filtres
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
              {canEdit && (
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une séance
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <EmploiDuTempsFilters
              enseignants={enseignants}
              groups={uniqueGroups}
              filterEnseignant={filterEnseignant}
              filterGroup={filterGroup}
              onEnseignantChange={setFilterEnseignant}
              onGroupChange={setFilterGroup}
            />
          )}

          <WeekCalendar
            seances={filteredSeances} ues={ues} enseignants={enseignants} salles={salles}
            weekStart={currentWeekStart}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canEdit ? handleDelete : undefined}
            loading={loading}
            perturbations={perturbations}
          />
        </TabsContent>

        <TabsContent value="progression">
          <UeProgressList ues={ues} seances={allSeances} perturbations={perturbations} />
        </TabsContent>

        <TabsContent value="responsables">
          {canEdit ? (
            <ResponsablesList departmentId={department?.id || ""} groups={uniqueGroups.length > 0 ? uniqueGroups : ["Groupe unique"]} />
          ) : (
            <p className="text-muted-foreground text-sm">Seuls le chef et l'assistant peuvent gérer les responsables de classe.</p>
          )}
        </TabsContent>
      </Tabs>

      {canEdit && (
        <SeanceFormDialog
          open={dialogOpen} onOpenChange={setDialogOpen} seance={editingSeance}
          departmentId={department?.id || ""} ues={ues} enseignants={enseignants}
          salles={salles} effectifs={effectifs} existingSeances={seances}
          onSuccess={() => { fetchAll(); fetchAllSeances(); }}
        />
      )}
    </DashboardLayout>
  );
};

export default EmploiDuTempsPage;
