import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PerturbationFormDialog from "@/components/perturbations/PerturbationFormDialog";
import PerturbationsList from "@/components/perturbations/PerturbationsList";
import CancelledHoursSummary from "@/components/perturbations/CancelledHoursSummary";
import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";
import type { Seance, UeInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
};

const PerturbationsPage = () => {
  const { department, role } = useAuth();
  const navigate = useNavigate();
  const canEdit = role === "chef" || role === "assistant";
  const academicYear = getCurrentAcademicYear();

  const [perturbations, setPerturbations] = useState<Perturbation[]>([]);
  const [seances, setSeances] = useState<Seance[]>([]);
  const [ues, setUes] = useState<UeInfo[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Perturbation | null>(null);

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);

    const [pertRes, seancesRes, uesRes, levelsRes, effectifsRes] = await Promise.all([
      supabase.from("perturbations").select("*").eq("department_id", department.id)
        .eq("academic_year", academicYear).order("start_date", { ascending: false }),
      supabase.from("seances").select("*").eq("department_id", department.id),
      supabase.from("unites_enseignement")
        .select("id, name, maquette_id, volume_cm, volume_td, volume_tp, maquettes!inner(department_id)")
        .eq("maquettes.department_id", department.id),
      supabase.from("department_levels").select("level").eq("department_id", department.id),
      supabase.from("effectifs").select("group_name").eq("department_id", department.id),
    ]);

    setPerturbations((pertRes.data as Perturbation[]) || []);
    setSeances((seancesRes.data as Seance[]) || []);
    setUes((uesRes.data as any[])?.map(u => ({
      id: u.id, name: u.name, maquette_id: u.maquette_id,
      volume_cm: u.volume_cm, volume_td: u.volume_td, volume_tp: u.volume_tp,
    })) || []);
    setLevels((levelsRes.data || []).map((l: any) => l.level));
    const uniqueGroups = [...new Set((effectifsRes.data || []).map((e: any) => e.group_name))];
    setGroups(uniqueGroups.sort());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [department]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("perturbations").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Perturbation supprimée");
    fetchData();
  };

  const handleEdit = (p: Perturbation) => { setEditing(p); setDialogOpen(true); };
  const handleAdd = () => { setEditing(null); setDialogOpen(true); };

  const handlePlanRattrapage = (ueId: string) => {
    // Navigate to emploi du temps page to add a catch-up session
    const basePath = role === "chef" ? "/dashboard/chef/emploi-du-temps" : "/dashboard/assistant/emploi-du-temps";
    navigate(basePath);
  };

  return (
    <DashboardLayout title="Perturbations">
      <Tabs defaultValue="list" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="list">Historique</TabsTrigger>
            <TabsTrigger value="rattrapage">Heures à rattraper</TabsTrigger>
          </TabsList>
          {canEdit && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" /> Déclarer une perturbation
            </Button>
          )}
        </div>

        <TabsContent value="list">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
          ) : (
            <PerturbationsList
              perturbations={perturbations}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="rattrapage">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
          ) : (
            <CancelledHoursSummary
              seances={seances}
              ues={ues}
              perturbations={perturbations}
              onPlanRattrapage={canEdit ? handlePlanRattrapage : undefined}
            />
          )}
        </TabsContent>
      </Tabs>

      {canEdit && (
        <PerturbationFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          departmentId={department?.id || ""}
          academicYear={academicYear}
          perturbation={editing}
          levels={levels}
          groups={groups}
          onSuccess={fetchData}
        />
      )}
    </DashboardLayout>
  );
};

export default PerturbationsPage;
