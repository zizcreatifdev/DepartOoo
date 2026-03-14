import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface Effectif {
  id?: string;
  department_id: string;
  level: "L1" | "L2" | "L3" | "M1" | "M2";
  group_name: string;
  student_count: number;
  academic_year: string;
  isNew?: boolean;
}

interface Props {
  academicYear: string;
}

const EffectifsEditor: React.FC<Props> = ({ academicYear }) => {
  const { department } = useAuth();
  const [effectifs, setEffectifs] = useState<Effectif[]>([]);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    if (!department?.id) return;
    const { data } = await supabase
      .from("effectifs")
      .select("*")
      .eq("department_id", department.id)
      .eq("academic_year", academicYear)
      .order("level")
      .order("group_name");
    setEffectifs(data || []);
  }, [department?.id, academicYear]);

  useEffect(() => { fetch(); }, [fetch]);

  const addRow = () => {
    if (!department?.id) return;
    setEffectifs([
      ...effectifs,
      {
        department_id: department.id,
        level: "L1",
        group_name: "Groupe unique",
        student_count: 0,
        academic_year: academicYear,
        isNew: true,
      },
    ]);
  };

  const update = (i: number, field: keyof Effectif, value: any) => {
    const updated = [...effectifs];
    (updated[i] as any)[field] = value;
    setEffectifs(updated);
  };

  const remove = async (i: number) => {
    const e = effectifs[i];
    if (e.id) {
      await supabase.from("effectifs").delete().eq("id", e.id);
    }
    setEffectifs(effectifs.filter((_, idx) => idx !== i));
    toast.success("Ligne supprimée");
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const toInsert = effectifs.filter((e) => e.isNew);
      const toUpdate = effectifs.filter((e) => !e.isNew && e.id);

      if (toInsert.length > 0) {
        const data = toInsert.map(({ isNew, id, ...rest }) => rest);
        const { error } = await supabase.from("effectifs").insert(data);
        if (error) throw error;
      }

      for (const e of toUpdate) {
        const { id, isNew, ...rest } = e;
        const { error } = await supabase.from("effectifs").update(rest).eq("id", id!);
        if (error) throw error;
      }

      toast.success("Effectifs enregistrés !");
      fetch();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Effectifs — {academicYear}</CardTitle>
        <CardDescription>Saisissez les effectifs par niveau et par groupe</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Niveau</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead className="w-32">Nombre d'étudiants</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {effectifs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun effectif. Cliquez sur "Ajouter" pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                effectifs.map((e, i) => (
                  <TableRow key={e.id || `new-${i}`}>
                    <TableCell>
                      <select
                        value={e.level}
                        onChange={(ev) => update(i, "level", ev.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {["L1", "L2", "L3", "M1", "M2"].map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input value={e.group_name} onChange={(ev) => update(i, "group_name", ev.target.value)} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={e.student_count} onChange={(ev) => update(i, "student_count", Number(ev.target.value))} className="h-8 text-center" min={0} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EffectifsEditor;
