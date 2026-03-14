import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, FileText, CheckCircle2, Clock, History } from "lucide-react";
import MaquetteEditor from "@/components/referentiel/MaquetteEditor";
import EffectifsEditor from "@/components/referentiel/EffectifsEditor";
import MaquetteHistory from "@/components/referentiel/MaquetteHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Filiere {
  id: string;
  name: string;
}

interface Maquette {
  id: string;
  filiere_id: string;
  level: string;
  semestre: string;
  academic_year: string;
  status: string;
  created_at: string;
  updated_at: string;
  validated_at: string | null;
}

const currentAcademicYear = () => {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
};

const ReferentielPage = () => {
  const { department, user, profile, role } = useAuth();
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [maquettes, setMaquettes] = useState<Maquette[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedSemestre, setSelectedSemestre] = useState<string>("");
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [editingMaquette, setEditingMaquette] = useState<Maquette | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFilieres = useCallback(async () => {
    if (!department?.id) return;
    const { data } = await supabase
      .from("department_filieres")
      .select("*")
      .eq("department_id", department.id);
    setFilieres(data || []);
  }, [department?.id]);

  const fetchMaquettes = useCallback(async () => {
    if (!department?.id) return;
    const { data } = await supabase
      .from("maquettes")
      .select("*")
      .eq("department_id", department.id)
      .eq("academic_year", academicYear)
      .order("created_at", { ascending: false });
    setMaquettes(data || []);
  }, [department?.id, academicYear]);

  useEffect(() => {
    fetchFilieres();
    fetchMaquettes();
  }, [fetchFilieres, fetchMaquettes]);

  const createMaquette = async () => {
    if (!department?.id || !selectedFiliere || !selectedLevel || !selectedSemestre) {
      toast.error("Veuillez sélectionner la filière, le niveau et le semestre.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("maquettes")
      .insert({
        department_id: department.id,
        filiere_id: selectedFiliere,
        level: selectedLevel as any,
        semestre: selectedSemestre as any,
        academic_year: academicYear,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("Cette maquette existe déjà pour cette combinaison.");
      } else {
        toast.error("Erreur lors de la création", { description: error.message });
      }
    } else {
      toast.success("Maquette créée !");
      // Log history
      await supabase.from("maquette_history").insert({
        maquette_id: data.id,
        user_id: user?.id,
        user_name: profile?.full_name || "",
        action: "Création",
        details: "Nouvelle maquette vierge créée",
      });
      fetchMaquettes();
      setEditingMaquette(data);
    }
    setLoading(false);
  };

  const duplicateFromPreviousYear = async () => {
    if (!department?.id || !selectedFiliere || !selectedLevel || !selectedSemestre) {
      toast.error("Veuillez sélectionner la filière, le niveau et le semestre.");
      return;
    }

    const prevYear = (() => {
      const [start] = academicYear.split("-").map(Number);
      return `${start - 1}-${start}`;
    })();

    setLoading(true);

    // Find previous maquette
    const { data: prevMaquette } = await supabase
      .from("maquettes")
      .select("*")
      .eq("department_id", department.id)
      .eq("filiere_id", selectedFiliere)
      .eq("level", selectedLevel as any)
      .eq("semestre", selectedSemestre as any)
      .eq("academic_year", prevYear)
      .single();

    if (!prevMaquette) {
      toast.error(`Aucune maquette trouvée pour ${prevYear}.`);
      setLoading(false);
      return;
    }

    // Create new maquette
    const { data: newMaquette, error } = await supabase
      .from("maquettes")
      .insert({
        department_id: department.id,
        filiere_id: selectedFiliere,
        level: selectedLevel as any,
        semestre: selectedSemestre as any,
        academic_year: academicYear,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la duplication", { description: error.message });
      setLoading(false);
      return;
    }

    // Copy UEs
    const { data: prevUEs } = await supabase
      .from("unites_enseignement")
      .select("*")
      .eq("maquette_id", prevMaquette.id);

    if (prevUEs && prevUEs.length > 0) {
      const newUEs = prevUEs.map(({ id, maquette_id, created_at, ...rest }) => ({
        ...rest,
        maquette_id: newMaquette.id,
      }));
      await supabase.from("unites_enseignement").insert(newUEs);
    }

    await supabase.from("maquette_history").insert({
      maquette_id: newMaquette.id,
      user_id: user?.id,
      user_name: profile?.full_name || "",
      action: "Duplication",
      details: `Dupliquée depuis l'année ${prevYear}`,
    });

    toast.success("Maquette dupliquée avec succès !");
    fetchMaquettes();
    setEditingMaquette(newMaquette);
    setLoading(false);
  };

  const validateMaquette = async (maquetteId: string) => {
    if (role !== "chef") {
      toast.error("Seul le chef de département peut valider une maquette.");
      return;
    }

    const { error } = await supabase
      .from("maquettes")
      .update({ status: "validee" as any, validated_by: user?.id, validated_at: new Date().toISOString() })
      .eq("id", maquetteId);

    if (error) {
      toast.error("Erreur lors de la validation", { description: error.message });
    } else {
      await supabase.from("maquette_history").insert({
        maquette_id: maquetteId,
        user_id: user?.id,
        user_name: profile?.full_name || "",
        action: "Validation",
        details: "Maquette validée par le chef de département",
      });
      toast.success("Maquette validée !");
      fetchMaquettes();
    }
  };

  const getFiliereName = (id: string) => filieres.find((f) => f.id === id)?.name || "—";

  if (editingMaquette) {
    return (
      <MaquetteEditor
        maquette={editingMaquette}
        filiereName={getFiliereName(editingMaquette.filiere_id)}
        onBack={() => {
          setEditingMaquette(null);
          fetchMaquettes();
        }}
      />
    );
  }

  if (showHistory) {
    return (
      <DashboardLayout title="Historique des modifications">
        <MaquetteHistory maquetteId={showHistory} onBack={() => setShowHistory(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Référentiel Pédagogique">
      <Tabs defaultValue="maquettes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="maquettes">
            <FileText className="h-4 w-4 mr-2" />
            Maquettes
          </TabsTrigger>
          <TabsTrigger value="effectifs">
            <Copy className="h-4 w-4 mr-2" />
            Effectifs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maquettes" className="space-y-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Créer une maquette</CardTitle>
              <CardDescription>Sélectionnez la filière, le niveau et le semestre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Select value={selectedFiliere} onValueChange={setSelectedFiliere}>
                  <SelectTrigger><SelectValue placeholder="Filière" /></SelectTrigger>
                  <SelectContent>
                    {filieres.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger><SelectValue placeholder="Niveau" /></SelectTrigger>
                  <SelectContent>
                    {["L1", "L2", "L3", "M1", "M2"].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSemestre} onValueChange={setSelectedSemestre}>
                  <SelectTrigger><SelectValue placeholder="Semestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S1">Semestre 1</SelectItem>
                    <SelectItem value="S2">Semestre 2</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={createMaquette} disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle maquette
                </Button>
                <Button variant="outline" onClick={duplicateFromPreviousYear} disabled={loading}>
                  <Copy className="h-4 w-4 mr-2" />
                  Dupliquer (année préc.)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Maquettes list */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Maquettes — {academicYear}</h3>
            {maquettes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucune maquette pour cette année. Créez-en une ci-dessus.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {maquettes.map((m) => (
                  <Card key={m.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{getFiliereName(m.filiere_id)}</span>
                          <Badge variant="outline">{m.level}</Badge>
                          <Badge variant="outline">{m.semestre}</Badge>
                          {m.status === "validee" ? (
                            <Badge className="bg-primary/10 text-primary border-primary/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Validée
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Brouillon
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Mis à jour le {new Date(m.updated_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowHistory(m.id)}>
                          <History className="h-4 w-4 mr-1" />
                          Historique
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMaquette(m)}>
                          Modifier
                        </Button>
                        {m.status === "brouillon" && role === "chef" && (
                          <Button size="sm" onClick={() => validateMaquette(m.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="effectifs">
          <EffectifsEditor academicYear={academicYear} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ReferentielPage;
