import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useEnseignantProfile } from "@/hooks/useEnseignantProfile";
import { Clock, TrendingUp } from "lucide-react";

interface SeanceRow {
  id: string;
  ue_id: string;
  type: string;
  start_time: string;
  end_time: string;
  seance_date: string;
}

const EnseignantHeuresPage = () => {
  const { enseignant, loading: profileLoading } = useEnseignantProfile();
  const [seances, setSeances] = useState<SeanceRow[]>([]);
  const [ues, setUes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enseignant) return;
    const fetchData = async () => {
      setLoading(true);
      const [sRes, ueRes] = await Promise.all([
        supabase.from("seances").select("id, ue_id, type, start_time, end_time, seance_date")
          .eq("enseignant_id", enseignant.id)
          .order("seance_date", { ascending: true }),
        supabase.from("unites_enseignement").select("id, name"),
      ]);
      setSeances(sRes.data || []);
      setUes(ueRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [enseignant]);

  const ueMap = useMemo(() => new Map(ues.map(u => [u.id, u.name])), [ues]);

  // Calculate hours per UE and type
  const breakdown = useMemo(() => {
    const map = new Map<string, { ue_name: string; cm: number; td: number; tp: number; total: number }>();
    seances.forEach(s => {
      const key = s.ue_id;
      if (!map.has(key)) {
        map.set(key, { ue_name: ueMap.get(key) || "UE", cm: 0, td: 0, tp: 0, total: 0 });
      }
      const entry = map.get(key)!;
      // Calculate duration in hours
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      const hours = (eh * 60 + em - sh * 60 - sm) / 60;

      if (s.type === "CM") entry.cm += hours;
      else if (s.type === "TD") entry.td += hours;
      else entry.tp += hours;
      entry.total += hours;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [seances, ueMap]);

  const totalHours = breakdown.reduce((sum, b) => sum + b.total, 0);

  if (profileLoading || loading) {
    return (
      <DashboardLayout title="Mes heures">
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </DashboardLayout>
    );
  }

  if (!enseignant) {
    return (
      <DashboardLayout title="Mes heures">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Votre profil enseignant n'est pas encore configuré.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const quota = enseignant.type === "permanent" ? enseignant.quota_hours : enseignant.allocated_hours;
  const progressPct = quota > 0 ? Math.min((totalHours / quota) * 100, 100) : 0;

  return (
    <DashboardLayout title="Mes heures">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Heures effectuées</p>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {enseignant.type === "permanent" ? "Quota statutaire" : "Heures allouées"}
                  </p>
                  <p className="text-2xl font-bold">{quota}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">{progressPct.toFixed(0)}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                {totalHours > quota && quota > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    +{(totalHours - quota).toFixed(1)}h complémentaires
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown by UE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détail par UE et type de séance</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune séance enregistrée.</p>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UE</TableHead>
                      <TableHead className="text-center">CM</TableHead>
                      <TableHead className="text-center">TD</TableHead>
                      <TableHead className="text-center">TP</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{b.ue_name}</TableCell>
                        <TableCell className="text-center">{b.cm > 0 ? `${b.cm.toFixed(1)}h` : "—"}</TableCell>
                        <TableCell className="text-center">{b.td > 0 ? `${b.td.toFixed(1)}h` : "—"}</TableCell>
                        <TableCell className="text-center">{b.tp > 0 ? `${b.tp.toFixed(1)}h` : "—"}</TableCell>
                        <TableCell className="text-center font-semibold">{b.total.toFixed(1)}h</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">
                        {breakdown.reduce((s, b) => s + b.cm, 0).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-center">
                        {breakdown.reduce((s, b) => s + b.td, 0).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-center">
                        {breakdown.reduce((s, b) => s + b.tp, 0).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-center">{totalHours.toFixed(1)}h</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EnseignantHeuresPage;
