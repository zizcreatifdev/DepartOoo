import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import ResponsableFormDialog, { type ResponsableClasse } from "./ResponsableFormDialog";

interface Props {
  departmentId: string;
  groups: string[];
}

const ResponsablesList: React.FC<Props> = ({ departmentId, groups }) => {
  const [responsables, setResponsables] = useState<ResponsableClasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResponsableClasse | null>(null);

  const fetch = async () => {
    if (!departmentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("responsables_classe")
      .select("*")
      .eq("department_id", departmentId)
      .order("group_name");
    setResponsables((data as ResponsableClasse[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [departmentId]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("responsables_classe").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Responsable supprimé");
    fetch();
  };

  // Groups that don't have a responsable yet
  const availableGroups = groups.filter(g => !responsables.find(r => r.group_name === g));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Responsables de classe
        </CardTitle>
        {availableGroups.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Chargement...</p>
        ) : responsables.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Aucun responsable de classe défini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groupe</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responsables.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.group_name}</TableCell>
                  <TableCell>{r.first_name} {r.last_name}</TableCell>
                  <TableCell className="text-xs">{r.whatsapp || "—"}</TableCell>
                  <TableCell className="text-xs">{r.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ResponsableFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departmentId={departmentId}
        groups={editing ? [editing.group_name, ...availableGroups] : availableGroups}
        responsable={editing}
        onSuccess={fetch}
      />
    </Card>
  );
};

export default ResponsablesList;
