import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pencil, UserX, UserCheck, Mail } from "lucide-react";
import type { Enseignant } from "@/pages/enseignants/EnseignantsPage";

interface Props {
  enseignants: Enseignant[];
  loading: boolean;
  onEdit: (e: Enseignant) => void;
  onToggleActive: (e: Enseignant) => void;
  onInvite: (e: Enseignant) => void;
}

const typeLabels: Record<string, string> = {
  permanent: "Permanent",
  vacataire: "Vacataire",
};

const EnseignantsList = ({ enseignants, loading, onEdit, onToggleActive, onInvite }: Props) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (enseignants.length === 0) {
    return <p className="text-muted-foreground text-center py-12">Aucun enseignant enregistré.</p>;
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Heures prévues</TableHead>
            <TableHead>Heures effectuées</TableHead>
            <TableHead>Progression</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enseignants.map((ens) => {
            const heuresPrevues = ens.type === "permanent" ? ens.quota_hours : ens.allocated_hours;
            const pct = heuresPrevues > 0 ? Math.min((ens.hours_done / heuresPrevues) * 100, 100) : 0;

            return (
              <TableRow key={ens.id} className={!ens.is_active ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  {ens.last_name} {ens.first_name}
                  <div className="text-xs text-muted-foreground">{ens.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={ens.type === "permanent" ? "default" : "secondary"}>
                    {typeLabels[ens.type]}
                  </Badge>
                </TableCell>
                <TableCell>{heuresPrevues}h</TableCell>
                <TableCell>{ens.hours_done}h</TableCell>
                <TableCell className="min-w-[120px]">
                  <Progress value={pct} className="h-2" />
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                </TableCell>
                <TableCell>
                  <Badge variant={ens.is_active ? "default" : "outline"}>
                    {ens.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(ens)} title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onToggleActive(ens)} title={ens.is_active ? "Désactiver" : "Activer"}>
                      {ens.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    {!ens.user_id && (
                      <Button variant="ghost" size="icon" onClick={() => onInvite(ens)} title="Inviter (créer compte)">
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default EnseignantsList;
