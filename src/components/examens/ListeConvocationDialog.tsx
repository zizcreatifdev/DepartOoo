/**
 * ListeConvocationDialog.tsx
 * Dialog affichant la liste de convocation filtrée pour un examen.
 * - Session normale  : tous les étudiants actifs du niveau, hors exclus/abandonnés
 * - Session rattrapage : étudiants ayant obtenu le statut 'rattrapage'
 * Export PDF via jsPDF + autoTable.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { genererListeConvocation, type StudentConvocation } from '@/engine/examens.engine';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  examen: any; // examen avec unites_enseignement, examen_salles jointé
  departmentId: string;
  academicYear: string;
}

const ListeConvocationDialog: React.FC<Props> = ({
  open, onOpenChange, examen, departmentId, academicYear,
}) => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentConvocation[]>([]);

  useEffect(() => {
    if (!open || !examen) return;

    setLoading(true);
    genererListeConvocation(
      examen.id,
      examen.ue_id,
      examen.session_type,
      departmentId,
      academicYear,
    )
      .then(list => setStudents(list))
      .catch(() => toast.error('Erreur lors de la génération de la liste'))
      .finally(() => setLoading(false));
  }, [open, examen, departmentId, academicYear]);

  const ueName = examen?.unites_enseignement?.name || 'UE';
  const salleNames = (examen?.examen_salles || [])
    .map((s: any) => s.salles?.name)
    .filter(Boolean)
    .join(', ') || 'Non assignée';

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // En-tête
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Convocation d\'examen', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`UE : ${ueName}`, 14, 28);
    doc.text(
      `Date : ${format(new Date(examen.exam_date), 'EEEE d MMMM yyyy', { locale: fr })}`,
      14, 35,
    );
    doc.text(
      `Horaire : ${examen.start_time?.substring(0, 5)} – ${examen.end_time?.substring(0, 5)}`,
      14, 42,
    );
    doc.text(
      `Session : ${examen.session_type === 'normale' ? 'Normale' : 'Rattrapage'}`,
      14, 49,
    );
    doc.text(`Salle(s) : ${salleNames}`, 14, 56);
    doc.text(`Nombre d'étudiants : ${students.length}`, 14, 63);

    // Trait séparateur
    doc.setLineWidth(0.3);
    doc.line(14, 67, 196, 67);

    // Tableau
    autoTable(doc, {
      startY: 72,
      head: [['N°', 'N° Étudiant', 'Nom', 'Prénom', 'Groupe', 'Niveau']],
      body: students.map((s, i) => [
        i + 1,
        s.student_number,
        s.last_name,
        s.first_name,
        s.group_name,
        s.level,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Pied de page
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      14,
      finalY + 10,
    );

    doc.save(`convocation-${ueName.replace(/\s+/g, '-')}-${examen.exam_date}.pdf`);
    toast.success('Convocation PDF exportée');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Liste de convocation — {ueName}
          </DialogTitle>
        </DialogHeader>

        {/* Infos examen */}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
          <span>{format(new Date(examen.exam_date), 'd MMM yyyy', { locale: fr })}</span>
          <span>•</span>
          <span>{examen.start_time?.substring(0, 5)} – {examen.end_time?.substring(0, 5)}</span>
          <span>•</span>
          <Badge variant={examen.session_type === 'rattrapage' ? 'secondary' : 'outline'} className="text-[10px]">
            {examen.session_type === 'normale' ? 'Normale' : 'Rattrapage'}
          </Badge>
          <span>•</span>
          <span>{salleNames}</span>
        </div>

        {/* Corps — liste étudiants */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Génération de la liste…</span>
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              {examen.session_type === 'rattrapage'
                ? 'Aucun étudiant en rattrapage pour cette UE.'
                : 'Aucun étudiant convocable trouvé.'}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {students.length} étudiant{students.length > 1 ? 's' : ''} convoqué{students.length > 1 ? 's' : ''}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs">N°</TableHead>
                    <TableHead className="text-xs">N° Étudiant</TableHead>
                    <TableHead className="text-xs">Nom</TableHead>
                    <TableHead className="text-xs">Prénom</TableHead>
                    <TableHead className="text-xs">Groupe</TableHead>
                    <TableHead className="text-xs">Niveau</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{s.student_number}</TableCell>
                      <TableCell className="font-medium text-sm">{s.last_name}</TableCell>
                      <TableCell className="text-sm">{s.first_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{s.group_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{s.level}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleExportPDF} disabled={loading || students.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListeConvocationDialog;
