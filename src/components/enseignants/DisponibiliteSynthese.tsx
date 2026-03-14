import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Enseignant } from "@/pages/enseignants/EnseignantsPage";

interface Props {
  enseignants: Enseignant[];
}

const TOTAL_SLOTS = 18; // 6 days × 3 slots

const DisponibiliteSynthese = ({ enseignants }: Props) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const activeIds = enseignants.filter((e) => e.is_active).map((e) => e.id);
      if (activeIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("enseignant_disponibilites")
        .select("enseignant_id")
        .in("enseignant_id", activeIds);

      const map: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        map[d.enseignant_id] = (map[d.enseignant_id] || 0) + 1;
      });
      setCounts(map);
      setLoading(false);
    };
    fetchCounts();
  }, [enseignants]);

  const activeEnseignants = enseignants.filter((e) => e.is_active);
  const notFilled = activeEnseignants.filter((e) => !counts[e.id] || counts[e.id] < TOTAL_SLOTS);

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />)}</div>;
  }

  if (notFilled.length === 0) {
    return <p className="text-muted-foreground text-center py-12">Tous les enseignants ont renseigné leurs disponibilités.</p>;
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Créneaux renseignés</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notFilled.map((ens) => {
            const filled = counts[ens.id] || 0;
            return (
              <TableRow key={ens.id}>
                <TableCell className="font-medium">{ens.last_name} {ens.first_name}</TableCell>
                <TableCell>
                  <Badge variant={ens.type === "permanent" ? "default" : "secondary"}>
                    {ens.type === "permanent" ? "Permanent" : "Vacataire"}
                  </Badge>
                </TableCell>
                <TableCell>{filled} / {TOTAL_SLOTS}</TableCell>
                <TableCell>
                  <Badge variant={filled === 0 ? "destructive" : "outline"}>
                    {filled === 0 ? "Non renseigné" : "Incomplet"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DisponibiliteSynthese;
