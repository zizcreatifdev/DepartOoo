import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { inviterEnseignant } from "@/services/invitations.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnseignantsList from "@/components/enseignants/EnseignantsList";
import EnseignantFormDialog from "@/components/enseignants/EnseignantFormDialog";
import HeuresComplementaires from "@/components/enseignants/HeuresComplementaires";
import DisponibiliteGrid from "@/components/enseignants/DisponibiliteGrid";
import DisponibiliteSynthese from "@/components/enseignants/DisponibiliteSynthese";

export interface Enseignant {
  id: string;
  department_id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: "permanent" | "vacataire";
  quota_hours: number;
  allocated_hours: number;
  hourly_rate: number;
  vacation_start: string | null;
  vacation_end: string | null;
  hours_done: number;
  is_active: boolean;
  user_id: string | null;
}

const EnseignantsPage = () => {
  const { department } = useAuth();
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Enseignant | null>(null);
  const [limiteMsg, setLimiteMsg] = useState<string | null>(null);

  const fetchData = async () => {
    if (!department) return;
    setLoading(true);
    const { data } = await supabase
      .from("enseignants")
      .select("*")
      .eq("department_id", department.id)
      .order("last_name");
    setEnseignants((data as Enseignant[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [department]);

  const handleToggleActive = async (ens: Enseignant) => {
    const { error } = await supabase
      .from("enseignants")
      .update({ is_active: !ens.is_active })
      .eq("id", ens.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(ens.is_active ? "Enseignant désactivé" : "Enseignant activé");
    fetchData();
  };

  const handleEdit = (ens: Enseignant) => {
    setEditing(ens);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleInvite = async (ens: Enseignant) => {
    if (ens.user_id) {
      toast.info("Ce compte enseignant a déjà été créé");
      return;
    }
    const result = await inviterEnseignant(
      ens.email,
      `${ens.first_name} ${ens.last_name}`,
      ens.id,
      ens.department_id,
    );
    if (!result.success) {
      if (result.error === "LIMITE_ATTEINTE") {
        setLimiteMsg(result.message ?? "Limite d'enseignants atteinte pour votre offre.");
        return;
      }
      toast.error(result.message ?? result.error ?? "Erreur lors de l'invitation");
      return;
    }
    toast.success("Invitation envoyée à " + ens.email);
    fetchData();
  };

  return (
    <DashboardLayout title="Enseignants">
      <Tabs defaultValue="list" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="disponibilites">Disponibilités</TabsTrigger>
            <TabsTrigger value="synthese">Synthèse dispo.</TabsTrigger>
            <TabsTrigger value="heures">Heures complémentaires</TabsTrigger>
          </TabsList>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Ajouter un enseignant
          </Button>
        </div>

        <TabsContent value="list">
          <EnseignantsList
            enseignants={enseignants}
            loading={loading}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            onInvite={handleInvite}
          />
        </TabsContent>

        <TabsContent value="disponibilites">
          <DisponibiliteGrid enseignants={enseignants} />
        </TabsContent>

        <TabsContent value="synthese">
          <DisponibiliteSynthese enseignants={enseignants} />
        </TabsContent>

        <TabsContent value="heures">
          <HeuresComplementaires enseignants={enseignants} />
        </TabsContent>
      </Tabs>

      <EnseignantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        enseignant={editing}
        departmentId={department?.id || ""}
        onSuccess={fetchData}
      />

      {/* Dialog limite d'offre atteinte */}
      <Dialog open={!!limiteMsg} onOpenChange={() => setLimiteMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limite atteinte</DialogTitle>
            <DialogDescription>{limiteMsg}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pour inviter davantage d'enseignants, passez à une offre supérieure depuis la page{" "}
            <strong>Équipe</strong>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setLimiteMsg(null)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EnseignantsPage;
