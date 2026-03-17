import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertTriangle as AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PerturbationFormDialog from "@/components/perturbations/PerturbationFormDialog";
import PerturbationsList from "@/components/perturbations/PerturbationsList";
import CancelledHoursSummary from "@/components/perturbations/CancelledHoursSummary";
import type { Perturbation } from "@/components/perturbations/PerturbationFormDialog";
import type { Seance, UeInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";
import { usePerturbationEngine } from "@/hooks/usePerturbationEngine";

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

  const { declarerPerturbation, annulerPerturbation } = usePerturbationEngine();

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);

    try {
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

      if (pertRes.error)    throw pertRes.error;
      if (seancesRes.error) throw seancesRes.error;

      setPerturbations((pertRes.data as Perturbation[]) || []);
      setSeances((seancesRes.data as Seance[]) || []);
      setUes((uesRes.data as any[])?.map(u => ({
        id: u.id, name: u.name, maquette_id: u.maquette_id,
        volume_cm: u.volume_cm, volume_td: u.volume_td, volume_tp: u.volume_tp,
      })) || []);
      setLevels((levelsRes.data || []).map((l: any) => l.level));
      const uniqueGroups = [...new Set((effectifsRes.data || []).map((e: any) => e.group_name))];
      setGroups(uniqueGroups.sort());
    } catch (err) {
      console.error("fetchData perturbations:", err);
      toast.error("Erreur lors du chargement des données. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [department]);

  const handleDelete = async (id: string) => {
    // Annuler l'impact moteur (réactiver les séances) avant la suppression DB
    await annulerPerturbation(id);
    const { error } = await supabase.from("perturbations").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Perturbation supprimée");
    fetchData();
  };

  const handleEdit = (p: Perturbation) => { setEditing(p); setDialogOpen(true); };
  const handleAdd = () => { setEditing(null); setDialogOpen(true); };

  /** Appelé par PerturbationFormDialog après insertion en base */
  const handlePerturbationSuccess = useCallback(
    async (created?: Perturbation) => {
      // Si c'est une nouvelle perturbation, déclencher le moteur d'impact
      if (created) {
        await declarerPerturbation({
          id: created.id,
          department_id: created.department_id,
          start_date: created.start_date,
          end_date: created.end_date,
          affected_groups: created.affected_groups?.length ? created.affected_groups : null,
          affected_levels: created.affected_levels?.length ? created.affected_levels : null,
          academic_year: created.academic_year,
        });
      }
      fetchData();
    },
    [declarerPerturbation],
  );

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
            <Card>
              <CardContent className="space-y-3 p-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : perturbations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-14 gap-3">
                <AlertTriangleIcon className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Aucune perturbation déclarée</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Déclarez une grève, un jour férié ou toute autre perturbation pour mettre à jour automatiquement le planning.
                </p>
                {canEdit && (
                  <Button size="sm" className="mt-1" onClick={handleAdd}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Déclarer une perturbation
                  </Button>
                )}
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="space-y-3 p-4">
                {[0, 1].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-8 w-8 rounded shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
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
          onSuccess={handlePerturbationSuccess}
        />
      )}
    </DashboardLayout>
  );
};

export default PerturbationsPage;
