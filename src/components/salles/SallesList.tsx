import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { Salle } from "@/pages/salles/SallesPage";

const typeLabels: Record<string, string> = {
  amphi: "Amphi",
  salle_td: "Salle TD",
  salle_tp: "Salle TP",
  laboratoire: "Laboratoire",
};

const typeColors: Record<string, string> = {
  amphi: "bg-primary/10 text-primary",
  salle_td: "bg-accent text-accent-foreground",
  salle_tp: "bg-secondary text-secondary-foreground",
  laboratoire: "bg-destructive/10 text-destructive",
};

interface Props {
  salles: Salle[];
  loading: boolean;
  onEdit: (s: Salle) => void;
  onDelete: (id: string) => void;
}

const SallesList = ({ salles, loading, onEdit, onDelete }: Props) => {
  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (salles.length === 0) {
    return <p className="text-muted-foreground text-center py-12">Aucune salle enregistrée. Cliquez sur "Ajouter une salle" pour commencer.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Capacité</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salles.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={typeColors[s.type]}>{typeLabels[s.type]}</Badge>
              </TableCell>
              <TableCell className="text-right">{s.capacity}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SallesList;
