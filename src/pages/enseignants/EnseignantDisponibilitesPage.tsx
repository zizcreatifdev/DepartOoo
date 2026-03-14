import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DisponibiliteGrid from "@/components/enseignants/DisponibiliteGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Enseignant } from "@/pages/enseignants/EnseignantsPage";

const EnseignantDisponibilitesPage = () => {
  const { user } = useAuth();
  const [enseignant, setEnseignant] = useState<Enseignant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("enseignants")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setEnseignant(data as Enseignant | null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout title="Mes disponibilités">
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </DashboardLayout>
    );
  }

  if (!enseignant) {
    return (
      <DashboardLayout title="Mes disponibilités">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Votre profil enseignant n'est pas encore configuré. Contactez votre chef de département.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mes disponibilités">
      <Card>
        <CardHeader>
          <CardTitle>Saisissez vos disponibilités</CardTitle>
        </CardHeader>
        <CardContent>
          <DisponibiliteGrid enseignants={[enseignant]} fixedEnseignantId={enseignant.id} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default EnseignantDisponibilitesPage;
