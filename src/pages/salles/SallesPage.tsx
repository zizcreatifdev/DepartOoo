import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import SallesList from "@/components/salles/SallesList";
import SalleFormDialog from "@/components/salles/SalleFormDialog";
import SalleAvailabilityGrid from "@/components/salles/SalleAvailabilityGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

export interface Salle {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  department_id: string;
}

export interface SalleCreneau {
  id: string;
  salle_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
}

const SallesPage = () => {
  const { department } = useAuth();
  const [salles, setSalles] = useState<Salle[]>([]);
  const [creneaux, setCreneaux] = useState<SalleCreneau[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalle, setEditingSalle] = useState<Salle | null>(null);

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);
    const [{ data: sallesData }, { data: creneauxData }] = await Promise.all([
      supabase.from("salles").select("*").eq("department_id", department.id).order("name"),
      supabase.from("salle_creneaux").select("*"),
    ]);
    setSalles((sallesData as Salle[]) || []);
    setCreneaux((creneauxData as SalleCreneau[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [department]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("salles").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Salle supprimée");
    fetchData();
  };

  const handleEdit = (salle: Salle) => {
    setEditingSalle(salle);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSalle(null);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Salles">
      <Tabs defaultValue="list" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">Liste des salles</TabsTrigger>
            <TabsTrigger value="availability">Disponibilité</TabsTrigger>
          </TabsList>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Ajouter une salle
          </Button>
        </div>

        <TabsContent value="list">
          <SallesList salles={salles} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="availability">
          <SalleAvailabilityGrid salles={salles} creneaux={creneaux} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>

      <SalleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        salle={editingSalle}
        departmentId={department?.id || ""}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
};

export default SallesPage;
