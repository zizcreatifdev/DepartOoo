import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

interface UE {
  id?: string;
  maquette_id: string;
  name: string;
  volume_cm: number;
  volume_td: number;
  volume_tp: number;
  coefficient: number;
  credits_ects: number;
  sort_order: number;
  isNew?: boolean;
}

interface MaquetteEditorProps {
  maquette: {
    id: string;
    level: string;
    semestre: string;
    academic_year: string;
    status: string;
  };
  filiereName: string;
  onBack: () => void;
}

const MaquetteEditor: React.FC<MaquetteEditorProps> = ({ maquette, filiereName, onBack }) => {
  const { user, profile } = useAuth();
  const [ues, setUes] = useState<UE[]>([]);
  const [saving, setSaving] = useState(false);
  const isValidated = maquette.status === "validee";

  const fetchUEs = useCallback(async () => {
    const { data } = await supabase
      .from("unites_enseignement")
      .select("*")
      .eq("maquette_id", maquette.id)
      .order("sort_order");
    setUes(
      (data || []).map((ue) => ({
        ...ue,
        volume_cm: Number(ue.volume_cm),
        volume_td: Number(ue.volume_td),
        volume_tp: Number(ue.volume_tp),
        coefficient: Number(ue.coefficient),
        credits_ects: Number(ue.credits_ects),
      }))
    );
  }, [maquette.id]);

  useEffect(() => {
    fetchUEs();
  }, [fetchUEs]);

  const addUE = () => {
    setUes([
      ...ues,
      {
        maquette_id: maquette.id,
        name: "",
        volume_cm: 0,
        volume_td: 0,
        volume_tp: 0,
        coefficient: 1,
        credits_ects: 0,
        sort_order: ues.length,
        isNew: true,
      },
    ]);
  };

  const updateUE = (index: number, field: keyof UE, value: string | number) => {
    const updated = [...ues];
    (updated[index] as any)[field] = value;
    setUes(updated);
  };

  const removeUE = async (index: number) => {
    const ue = ues[index];
    if (ue.id) {
      await supabase.from("unites_enseignement").delete().eq("id", ue.id);
    }
    setUes(ues.filter((_, i) => i !== index));
    toast.success("UE supprimée");
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const toInsert = ues.filter((ue) => ue.isNew && ue.name.trim());
      const toUpdate = ues.filter((ue) => !ue.isNew && ue.id);

      if (toInsert.length > 0) {
        const insertData = toInsert.map(({ isNew, id, ...rest }) => rest);
        const { error } = await supabase.from("unites_enseignement").insert(insertData);
        if (error) throw error;
      }

      for (const ue of toUpdate) {
        const { id, isNew, ...rest } = ue;
        const { error } = await supabase.from("unites_enseignement").update(rest).eq("id", id!);
        if (error) throw error;
      }

      // Log history
      await supabase.from("maquette_history").insert({
        maquette_id: maquette.id,
        user_id: user?.id,
        user_name: profile?.full_name || "",
        action: "Modification",
        details: `${ues.length} UE(s) enregistrée(s)`,
      });

      toast.success("Maquette enregistrée !");
      fetchUEs();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
    setSaving(false);
  };

  const totalCM = ues.reduce((s, u) => s + u.volume_cm, 0);
  const totalTD = ues.reduce((s, u) => s + u.volume_td, 0);
  const totalTP = ues.reduce((s, u) => s + u.volume_tp, 0);
  const totalCredits = ues.reduce((s, u) => s + u.credits_ects, 0);

  return (
    <DashboardLayout title={`Maquette — ${filiereName} ${maquette.level} ${maquette.semestre}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex gap-2">
            {!isValidated && (
              <>
                <Button variant="outline" onClick={addUE}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une UE
                </Button>
                <Button onClick={saveAll} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </>
            )}
          </div>
        </div>

        {isValidated && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 text-sm text-primary font-medium">
              Cette maquette est validée et ne peut plus être modifiée.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Unités d'enseignement — {filiereName} · {maquette.level} · {maquette.semestre} · {maquette.academic_year}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="min-w-[200px]">Nom de l'UE</TableHead>
                  <TableHead className="w-20 text-center">CM (h)</TableHead>
                  <TableHead className="w-20 text-center">TD (h)</TableHead>
                  <TableHead className="w-20 text-center">TP (h)</TableHead>
                  <TableHead className="w-20 text-center">VH Total</TableHead>
                  <TableHead className="w-20 text-center">Coef.</TableHead>
                  <TableHead className="w-20 text-center">ECTS</TableHead>
                  {!isValidated && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isValidated ? 8 : 9} className="text-center text-muted-foreground py-8">
                      Aucune UE. Cliquez sur "Ajouter une UE" pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  ues.map((ue, i) => (
                    <TableRow key={ue.id || `new-${i}`}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={ue.name}
                          onChange={(e) => updateUE(i, "name", e.target.value)}
                          placeholder="Nom de l'UE"
                          disabled={isValidated}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={ue.volume_cm}
                          onChange={(e) => updateUE(i, "volume_cm", Number(e.target.value))}
                          disabled={isValidated}
                          className="h-8 text-center"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={ue.volume_td}
                          onChange={(e) => updateUE(i, "volume_td", Number(e.target.value))}
                          disabled={isValidated}
                          className="h-8 text-center"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={ue.volume_tp}
                          onChange={(e) => updateUE(i, "volume_tp", Number(e.target.value))}
                          disabled={isValidated}
                          className="h-8 text-center"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {ue.volume_cm + ue.volume_td + ue.volume_tp}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={ue.coefficient}
                          onChange={(e) => updateUE(i, "coefficient", Number(e.target.value))}
                          disabled={isValidated}
                          className="h-8 text-center"
                          min={0}
                          step={0.5}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={ue.credits_ects}
                          onChange={(e) => updateUE(i, "credits_ects", Number(e.target.value))}
                          disabled={isValidated}
                          className="h-8 text-center"
                          min={0}
                        />
                      </TableCell>
                      {!isValidated && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeUE(i)} className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
                {ues.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell></TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{totalCM}</TableCell>
                    <TableCell className="text-center">{totalTD}</TableCell>
                    <TableCell className="text-center">{totalTP}</TableCell>
                    <TableCell className="text-center">{totalCM + totalTD + totalTP}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center">{totalCredits}</TableCell>
                    {!isValidated && <TableCell></TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MaquetteEditor;
