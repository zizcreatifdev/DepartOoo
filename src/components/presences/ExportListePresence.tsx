/**
 * ExportListePresence.tsx
 * Génère un PDF de fiche de présence avec case d'émargement.
 * Enregistre le document dans la table 'documents'.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { saveDocumentRecord } from '@/lib/saveDocument';

// ============================================================
// Types
// ============================================================

export interface SeanceInfoPresence {
  id: string;
  ue_name: string;
  type: string;
  group_name: string;
  enseignant_name: string;
  seance_date: string;
  start_time: string;
  end_time: string;
}

export interface EtudiantInfoPresence {
  id: string;
  student_number: string;
  last_name: string;
  first_name: string;
}

// absences_count : student_id → nb absences NJ sur cette UE + type
export type AbsenceCountMap = Record<string, number>;

// ============================================================
// Fonction principale
// ============================================================

export async function exportListePresencePDF(
  seance: SeanceInfoPresence,
  etudiants: EtudiantInfoPresence[],
  absences_count: AbsenceCountMap,
  departmentId: string,
  academicYear: string,
  generatedByName?: string,
): Promise<void> {
  const doc = new jsPDF();
  const dateFormatted = format(new Date(seance.seance_date), 'EEEE d MMMM yyyy', { locale: fr });

  // ---- En-tête ----
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("Fiche de présence", 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const infoY = 26;
  const col1 = 14;
  const col2 = 105;
  doc.text(`UE : ${seance.ue_name}`, col1, infoY);
  doc.text(`Type : ${seance.type}`, col2, infoY);
  doc.text(`Groupe : ${seance.group_name}`, col1, infoY + 6);
  doc.text(`Enseignant : ${seance.enseignant_name}`, col2, infoY + 6);
  doc.text(`Date : ${dateFormatted}`, col1, infoY + 12);
  doc.text(
    `Horaire : ${seance.start_time.substring(0, 5)} – ${seance.end_time.substring(0, 5)}`,
    col2, infoY + 12,
  );

  doc.setLineWidth(0.3);
  doc.line(14, infoY + 17, 196, infoY + 17);

  // ---- Tableau ----
  autoTable(doc, {
    startY: infoY + 22,
    head: [['N°', 'Matricule', 'Nom', 'Prénom', 'Abs. NJ', 'Émargement']],
    body: etudiants.map((e, i) => [
      i + 1,
      e.student_number,
      e.last_name,
      e.first_name,
      absences_count[e.id] ?? 0,
      '', // case émargement vide
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, font: 'courier' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 38, halign: 'center' }, // large case pour la signature
    },
    didParseCell: (data) => {
      // Colorer les étudiants avec beaucoup d'absences
      if (data.section === 'body' && data.column.index === 4) {
        const val = Number(data.cell.raw);
        if (val >= 3) data.cell.styles.textColor = [200, 0, 0];
        else if (val >= 2) data.cell.styles.textColor = [200, 100, 0];
      }
    },
  });

  // ---- Pied de page ----
  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  const footerY = Math.min(finalY + 12, 275);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Effectif : _____ / ${etudiants.length}`, 14, footerY);
  doc.text('Enseignant : ________________________________', 14, footerY + 10);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}${generatedByName ? ' par ' + generatedByName : ''}`,
    14, footerY + 20,
  );

  // ---- Sauvegarde ----
  const fileName = `presence-${seance.ue_name.replace(/\s+/g, '-')}-${seance.seance_date}.pdf`;
  doc.save(fileName);

  await saveDocumentRecord({
    type: 'liste_presence',
    title: `Fiche présence — ${seance.ue_name} (${seance.type}) — ${seance.group_name} — ${dateFormatted}`,
    file_name: fileName,
    department_id: departmentId,
    academic_year: academicYear,
    generated_by_name: generatedByName ?? null,
  });
}
