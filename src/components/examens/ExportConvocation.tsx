/**
 * ExportConvocation.tsx
 * Génère un PDF de convocation d'examen avec cases d'émargement.
 * Enregistre le document dans la table 'documents'.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { saveDocumentRecord } from '@/lib/saveDocument';
import type { StudentConvocation } from '@/engine/examens.engine';

// ============================================================
// Types
// ============================================================

export interface ExamenInfoConvocation {
  id: string;
  ue_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  academic_year: string;
}

export interface UeInfoConvocation {
  name: string;
  level: string;
}

export interface SalleInfoConvocation {
  name: string;
  capacity: number;
}

export interface SurveillantInfo {
  first_name: string;
  last_name: string;
}

// ============================================================
// Fonction principale
// ============================================================

/**
 * Génère et télécharge la convocation d'examen.
 * Les abandonnés et exclus sont déjà filtrés dans `etudiants_convoques`
 * (provenant de genererListeConvocation()).
 */
export async function exportConvocationPDF(
  examen: ExamenInfoConvocation,
  ue: UeInfoConvocation,
  etudiants_convoques: StudentConvocation[],
  salles: SalleInfoConvocation[],
  surveillants: SurveillantInfo[],
  departmentId: string,
  generatedByName?: string,
): Promise<void> {
  const doc = new jsPDF();
  const dateFormatted = format(new Date(examen.exam_date), 'EEEE d MMMM yyyy', { locale: fr });
  const salleNames = salles.map(s => s.name).join(', ') || 'Non assignée';
  const sessionLabel = examen.session_type === 'rattrapage' ? 'Rattrapage' : 'Normale';

  // ---- En-tête ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("Convocation d'examen", 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const col1 = 14;
  const col2 = 105;
  doc.text(`UE : ${ue.name}`, col1, 28);
  doc.text(`Session : ${sessionLabel}`, col2, 28);
  doc.text(`Niveau : ${ue.level}`, col1, 35);
  doc.text(`Nb convoqués : ${etudiants_convoques.length}`, col2, 35);
  doc.text(`Date : ${dateFormatted}`, col1, 42);
  doc.text(
    `Horaire : ${examen.start_time.substring(0, 5)} – ${examen.end_time.substring(0, 5)}`,
    col2, 42,
  );
  doc.text(`Salle(s) : ${salleNames}`, col1, 49);

  doc.setLineWidth(0.3);
  doc.line(14, 54, 196, 54);

  // ---- Tableau ----
  autoTable(doc, {
    startY: 59,
    head: [['N°', 'Matricule', 'Nom', 'Prénom', 'Groupe', 'Salle', 'Émargement']],
    body: etudiants_convoques.map((s, i) => [
      i + 1,
      s.student_number,
      s.last_name,
      s.first_name,
      s.group_name,
      salleNames, // même salle pour tous (pas d'affectation individuelle)
      '',
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, font: 'courier' },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 32, halign: 'center' },
    },
  });

  // ---- Pied de page ----
  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  const footerY = Math.min(finalY + 12, 270);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const surveList = surveillants.map(s => `${s.first_name} ${s.last_name}`).join(', ') || '—';
  doc.text(`Surveillant(s) : ${surveList}`, 14, footerY);

  doc.setLineWidth(0.2);
  doc.setDrawColor(150);
  doc.line(14, footerY + 14, 90, footerY + 14);
  doc.text('Signature enseignant responsable', 14, footerY + 19);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}${generatedByName ? ' par ' + generatedByName : ''}`,
    14, footerY + 26,
  );

  // ---- Sauvegarde ----
  const fileName = `convocation-${ue.name.replace(/\s+/g, '-')}-${examen.exam_date}-${examen.session_type}.pdf`;
  doc.save(fileName);

  await saveDocumentRecord({
    type: 'convocation',
    title: `Convocation — ${ue.name} — ${sessionLabel} — ${dateFormatted}`,
    file_name: fileName,
    department_id: departmentId,
    academic_year: examen.academic_year,
    generated_by_name: generatedByName ?? null,
    related_ue_id: examen.ue_id,
    related_level: ue.level,
  });
}
