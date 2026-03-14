import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { Student } from "./StudentsList";

interface Seance {
  id: string;
  ue_id: string;
  type: string;
  group_name: string;
}

interface UeInfo {
  id: string;
  name: string;
}

interface Presence {
  seance_id: string;
  student_id: string;
  status: string;
}

interface AbsenceSettings {
  threshold_cm: number;
  threshold_td: number;
  threshold_tp: number;
}

interface Props {
  students: Student[];
  seances: Seance[];
  ues: UeInfo[];
  presences: Presence[];
  absenceSettings: AbsenceSettings;
  cancelledSeanceIds: Set<string>;
}

const AbsenceDashboard: React.FC<Props> = ({ students, seances, ues, presences, absenceSettings, cancelledSeanceIds }) => {
  const data = useMemo(() => {
    const validSeances = seances.filter(s => !cancelledSeanceIds.has(s.id));
    const results: Array<{
      student: Student;
      ue: UeInfo;
      type: string;
      absences: number;
      threshold: number;
      isExcluded: boolean;
      isNearExclusion: boolean;
    }> = [];

    for (const student of students) {
      for (const ue of ues) {
        for (const type of ["CM", "TD", "TP"]) {
          const threshold = type === "CM" ? absenceSettings.threshold_cm : type === "TD" ? absenceSettings.threshold_td : absenceSettings.threshold_tp;
          const ueSeances = validSeances.filter(s => s.ue_id === ue.id && s.type === type && s.group_name === student.group_name);
          const absences = presences.filter(p =>
            p.student_id === student.id &&
            p.status === "absent_non_justifie" &&
            ueSeances.some(s => s.id === p.seance_id)
          ).length;

          if (absences > 0) {
            results.push({
              student, ue, type, absences, threshold,
              isExcluded: absences >= threshold,
              isNearExclusion: absences >= threshold - 1 && absences < threshold,
            });
          }
        }
      }
    }

    return results.sort((a, b) => {
      if (a.isExcluded !== b.isExcluded) return a.isExcluded ? -1 : 1;
      if (a.isNearExclusion !== b.isNearExclusion) return a.isNearExclusion ? -1 : 1;
      return b.absences - a.absences;
    });
  }, [students, seances, ues, presences, absenceSettings, cancelledSeanceIds]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune absence enregistrée.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Étudiant</TableHead>
              <TableHead>Groupe</TableHead>
              <TableHead>UE</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Absences NJ</TableHead>
              <TableHead className="text-center">Seuil</TableHead>
              <TableHead className="text-center">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d, i) => (
              <TableRow key={i} className={d.isExcluded ? "bg-red-50" : d.isNearExclusion ? "bg-amber-50" : ""}>
                <TableCell className="font-mono text-xs">{d.student.student_number}</TableCell>
                <TableCell className="font-medium">{d.student.last_name} {d.student.first_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{d.student.group_name}</Badge></TableCell>
                <TableCell className="text-sm">{d.ue.name}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{d.type}</Badge></TableCell>
                <TableCell className="text-center font-medium">{d.absences}</TableCell>
                <TableCell className="text-center text-muted-foreground">{d.threshold}</TableCell>
                <TableCell className="text-center">
                  {d.isExcluded && <Badge variant="destructive" className="text-[10px]">EXCLU</Badge>}
                  {d.isNearExclusion && !d.isExcluded && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                      <AlertTriangle className="h-3 w-3 mr-0.5" /> 1 absence du seuil
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AbsenceDashboard;
