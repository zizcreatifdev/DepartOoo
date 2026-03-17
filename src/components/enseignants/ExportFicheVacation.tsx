/**
 * ExportFicheVacation.tsx
 * Génère un PDF de fiche de vacation pour un enseignant vacataire.
 * Tableau des séances + récapitulatif + montant total + zones de signature.
 * Enregistre le document dans la table 'documents'.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { saveDocumentRecord } from '@/lib/saveDocument';

// ============================================================
// Types
// ============================================================

export interface EnseignantVacation {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  grade?: string | null;
}

export interface SeanceVacation {
  id: string;
  seance_date: string;         // 'YYYY-MM-DD'
  start_time: string;          // 'HH:MM:SS'
  end_time: string;            // 'HH:MM:SS'
  ue_name: string;
  type: string;                // CM | TD | TP | rattrapage
  is_cancelled?: boolean;
}

export interface VacationConfig {
  hourly_rate: number;         // taux horaire en DA (ou autre devise)
  heures_allouees: number;     // total heures contractuelles
  currency_symbol?: string;    // ex: 'DA', '€' (défaut: 'DA')
  academic_year: string;
}

// ============================================================
// Helpers internes
// ============================================================

const HEADER_COLOR: [number, number, number] = [30, 58, 95];
const ALT_ROW: [number, number, number] = [248, 250, 252];
const RED:    [number, number, number] = [180, 0, 0];
const ORANGE: [number, number, number] = [180, 100, 0];

/**
 * Calcule la durée en heures décimales entre deux horaires 'HH:MM:SS'.
 */
function dureeHeures(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  return Math.max(0, (endMin - startMin) / 60);
}

function fmtHeure(time: string): string {
  return time.substring(0, 5);
}

function fmtDate(date: string): string {
  return format(parseISO(date), 'EEE dd/MM/yyyy', { locale: fr });
}

// ============================================================
// Fonction principale
// ============================================================

export async function exportFicheVacationPDF(
  enseignant: EnseignantVacation,
  seances: SeanceVacation[],
  config: VacationConfig,
  departmentId: string,
  generatedByName?: string,
): Promise<void> {
  const doc = new jsPDF();
  const now = new Date();
  const currency = config.currency_symbol ?? 'DA';

  // ---- Séparation effectuées / annulées ----
  const seancesEffectuees = seances.filter(s => !s.is_cancelled);
  const seancesAnnulees   = seances.filter(s =>  s.is_cancelled);

  const heuresEffectuees = seancesEffectuees.reduce(
    (acc, s) => acc + dureeHeures(s.start_time, s.end_time), 0,
  );
  const heuresAnnulees = seancesAnnulees.reduce(
    (acc, s) => acc + dureeHeures(s.start_time, s.end_time), 0,
  );
  const heuresComplementaires = Math.max(0, heuresEffectuees - config.heures_allouees);
  const montantTotal = heuresEffectuees * config.hourly_rate;

  // ---- En-tête ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiche de vacation', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const col1 = 14;
  const col2 = 110;
  doc.text(`Enseignant : ${enseignant.last_name} ${enseignant.first_name}`, col1, 28);
  if (enseignant.grade) {
    doc.text(`Grade : ${enseignant.grade}`, col2, 28);
  }
  if (enseignant.email) {
    doc.text(`Email : ${enseignant.email}`, col1, 35);
  }
  if (enseignant.phone) {
    doc.text(`Tél : ${enseignant.phone}`, col2, 35);
  }
  doc.text(`Année universitaire : ${config.academic_year}`, col1, 42);
  doc.text(
    `Taux horaire : ${config.hourly_rate.toLocaleString('fr-FR')} ${currency}/h`,
    col2, 42,
  );

  doc.setLineWidth(0.3);
  doc.line(14, 47, 196, 47);

  // ---- Tableau des séances ----
  // Tri par date puis heure
  const seancesSorted = [...seances].sort((a, b) => {
    const dateComp = a.seance_date.localeCompare(b.seance_date);
    if (dateComp !== 0) return dateComp;
    return a.start_time.localeCompare(b.start_time);
  });

  // Suivi des métadonnées par ligne pour colorisation
  const rowMeta = seancesSorted.map(s => ({ cancelled: !!s.is_cancelled }));

  autoTable(doc, {
    startY: 52,
    head: [['Date', 'UE', 'Type', 'Horaire', 'Durée (h)', 'Statut']],
    body: seancesSorted.map(s => [
      fmtDate(s.seance_date),
      s.ue_name,
      s.type,
      `${fmtHeure(s.start_time)} – ${fmtHeure(s.end_time)}`,
      dureeHeures(s.start_time, s.end_time).toFixed(2),
      s.is_cancelled ? 'Annulée' : 'Effectuée',
    ]),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255 },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: {
      0: { cellWidth: 34 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 18, halign: 'right', font: 'courier' },
      5: { cellWidth: 22, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const meta = rowMeta[data.row.index];
      if (!meta) return;

      if (meta.cancelled) {
        // Ligne annulée : texte rouge
        data.cell.styles.textColor = RED;
        data.cell.styles.fillColor = [255, 235, 238];
      } else if (data.column.index === 5) {
        // "Effectuée" en vert
        data.cell.styles.textColor = [0, 128, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const meta = rowMeta[data.row.index];
      if (!meta?.cancelled) return;

      // Trait barré sur les lignes annulées
      const { x, y, width, height } = data.cell;
      const midY = y + height / 2;
      doc.setDrawColor(...RED);
      doc.setLineWidth(0.3);
      doc.line(x + 1, midY, x + width - 1, midY);
    },
  });

  // ---- Récapitulatif ----
  const tableEndY = (doc as any).lastAutoTable?.finalY || 200;
  const recapY = Math.min(tableEndY + 12, 230);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Récapitulatif', 14, recapY);

  // Tableau récap 2 colonnes
  autoTable(doc, {
    startY: recapY + 4,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Heures allouées',        `${config.heures_allouees.toFixed(2)} h`],
      ['Heures effectuées',      `${heuresEffectuees.toFixed(2)} h`],
      ['Heures annulées',        `${heuresAnnulees.toFixed(2)} h`],
      ['Heures complémentaires', `${heuresComplementaires.toFixed(2)} h`],
      [
        `Montant total (${heuresEffectuees.toFixed(2)} h × ${config.hourly_rate.toLocaleString('fr-FR')} ${currency})`,
        `${montantTotal.toLocaleString('fr-FR')} ${currency}`,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255 },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 52, halign: 'right', font: 'courier', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const rowIdx = data.row.index;
      if (data.column.index === 1) {
        // Annulées en rouge
        if (rowIdx === 2) data.cell.styles.textColor = RED;
        // Complémentaires en orange
        if (rowIdx === 3 && heuresComplementaires > 0) data.cell.styles.textColor = ORANGE;
        // Montant total en gras bleu marine
        if (rowIdx === 4) {
          data.cell.styles.textColor = HEADER_COLOR;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      }
      // Ligne montant total : fond légèrement coloré
      if (rowIdx === 4) {
        data.cell.styles.fillColor = [224, 236, 255];
      }
    },
    tableWidth: 'wrap',
    margin: { left: 14 },
  });

  // ---- Zones de signature ----
  const sigEndY = (doc as any).lastAutoTable?.finalY || recapY + 60;
  const sigY = Math.min(sigEndY + 16, 262);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  // Signature enseignant (gauche)
  doc.text("L'enseignant(e)", 14, sigY);
  doc.setLineWidth(0.2);
  doc.setDrawColor(100);
  doc.line(14, sigY + 18, 88, sigY + 18);
  doc.setFontSize(8);
  doc.text(`${enseignant.last_name} ${enseignant.first_name}`, 14, sigY + 23);

  // Signature chef de département (droite)
  doc.setFontSize(9);
  doc.text('Le chef de département', 120, sigY);
  doc.line(120, sigY + 18, 194, sigY + 18);
  doc.setFontSize(8);
  doc.text('Cachet et signature', 120, sigY + 23);

  // ---- Pied de page ----
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text(
    `Généré le ${format(now, 'dd/MM/yyyy à HH:mm', { locale: fr })}${generatedByName ? ' par ' + generatedByName : ''}`,
    14, sigY + 30,
  );

  // ---- Sauvegarde ----
  const safeName = `${enseignant.last_name}-${enseignant.first_name}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  const fileName = `vacation-${safeName}-${config.academic_year}.pdf`;
  doc.save(fileName);

  await saveDocumentRecord({
    type: 'fiche_vacation',
    title: `Fiche de vacation — ${enseignant.last_name} ${enseignant.first_name} — ${config.academic_year}`,
    file_name: fileName,
    department_id: departmentId,
    academic_year: config.academic_year,
    generated_by_name: generatedByName ?? null,
    related_enseignant_id: enseignant.id,
  });
}
