import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Enseignant } from "@/pages/enseignants/EnseignantsPage";

interface Props {
  enseignants: Enseignant[];
}

const HeuresComplementaires = ({ enseignants }: Props) => {
  const permanents = enseignants.filter(
    (e) => e.type === "permanent" && e.is_active && e.hours_done > e.quota_hours
  );

  if (permanents.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        Aucun enseignant permanent n'a dépassé son quota d'heures.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Quota statutaire</TableHead>
            <TableHead>Heures effectuées</TableHead>
            <TableHead>Heures complémentaires</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {permanents.map((ens) => {
            const complement = ens.hours_done - ens.quota_hours;
            return (
              <TableRow key={ens.id}>
                <TableCell className="font-medium">
                  {ens.last_name} {ens.first_name}
                </TableCell>
                <TableCell>{ens.quota_hours}h</TableCell>
                <TableCell>{ens.hours_done}h</TableCell>
                <TableCell>
                  <Badge variant="destructive">+{complement}h</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default HeuresComplementaires;
