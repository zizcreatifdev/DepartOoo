/**
 * ExportResultats.tsx
 * Deux fonctions PDF pour le module Notes :
 *  - exportReleveNotesPDF   : relevé individuel par étudiant
 *  - exportListeResultatsPDF : liste de résultats complète de la promo
 * Enregistre chaque document dans la table 'documents'.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { saveDocumentRecord } from '@/lib/saveDocument';

// ============================================================
// Types partagés
// ============================================================

export interface EtudiantInfo {
  id: string;
  student_number: string;
  last_name: string;
  first_name: string;
  group_name?: string;
  level?: string;
}

export interface NoteParUE {
  ue_id: string;
  ue_name: string;
  coefficient: number;
  note: number | null;       // note sur 20
  validated: boolean;         // true si note >= 10
}

export interface MoyennesInfo {
  moyenne_generale: number;   // sur 20
  statut: 'admis' | 'ajourne' | 'rattrapage';
}

// Pour la liste de résultats complète
export interface ResultatEtudiant {
  etudiant: EtudiantInfo;
  moyenne: number;
}

export interface StatsPromo {
  taux_reussite: number;     // pourcentage
  moyenne_promo: number;     // sur 20
  total_etudiants: number;
}

// ============================================================
// Helpers internes
// ============================================================

const HEADER_COLOR: [number, number, number] = [30, 58, 95];
const ALT_ROW: [number, number, number] = [248, 250, 252];

function labelStatut(statut: MoyennesInfo['statut']): string {
  switch (statut) {
    case 'admis':      return 'ADMIS';
    case 'ajourne':    return 'AJOURNÉ';
    case 'rattrapage': return 'RATTRAPAGE';
  }
}

function colorStatut(statut: MoyennesInfo['statut']): [number, number, number] {
  switch (statut) {
    case 'admis':      return [0, 128, 0];
    case 'ajourne':    return [180, 0, 0];
    case 'rattrapage': return [180, 100, 0];
  }
}

function noteColor(note: number | null): [number, number, number] | null {
  if (note === null) return [130, 130, 130];
  if (note < 8)  return [180, 0, 0];
  if (note < 10) return [180, 100, 0];
  return null; // couleur par défaut
}

function fmtNote(note: number | null): string {
  if (note === null) return 'ABS';
  return note.toFixed(2);
}

// ============================================================
// 1. Relevé de notes individuel
// ============================================================

export async function exportReleveNotesPDF(
  etudiant: EtudiantInfo,
  notes_par_ue: NoteParUE[],
  moyennes: MoyennesInfo,
  departmentId: string,
  academicYear: string,
  generatedByName?: string,
): Promise<void> {
  const doc = new jsPDF();
  const now = new Date();

  // ---- En-tête ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relevé de notes', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const col1 = 14;
  const col2 = 110;
  doc.text(`Étudiant : ${etudiant.last_name} ${etudiant.first_name}`, col1, 28);
  doc.text(`Matricule : ${etudiant.student_number}`, col2, 28);
  if (etudiant.group_name) {
    doc.text(`Groupe : ${etudiant.group_name}`, col1, 35);
  }
  if (etudiant.level) {
    doc.text(`Niveau : ${etudiant.level}`, col2, 35);
  }
  doc.text(`Année universitaire : ${academicYear}`, col1, 42);

  doc.setLineWidth(0.3);
  doc.line(14, 47, 196, 47);

  // ---- Tableau UE | Coeff | Note | Validé ----
  autoTable(doc, {
    startY: 52,
    head: [['Unité d\'Enseignement', 'Coeff.', 'Note /20', 'Validée']],
    body: notes_par_ue.map(n => [
      n.ue_name,
      n.coefficient,
      fmtNote(n.note),
      n.note !== null ? (n.validated ? 'Oui' : 'Non') : '—',
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255 },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: {
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 24, halign: 'center', font: 'courier' },
      3: { cellWidth: 20, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;

      // Colorer la note selon le score
      if (data.column.index === 2) {
        const rawNote = notes_par_ue[data.row.index]?.note ?? null;
        const color = noteColor(rawNote);
        if (color) {
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      }

      // Colorer "Validée"
      if (data.column.index === 3) {
        const rawNote = notes_par_ue[data.row.index]?.note ?? null;
        if (rawNote !== null) {
          data.cell.styles.textColor = notes_par_ue[data.row.index].validated
            ? [0, 128, 0]
            : [180, 0, 0];
        }
      }
    },
  });

  // ---- Bilan / pied ----
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  const summaryY = Math.min(finalY + 14, 260);

  // Ligne récap
  doc.setLineWidth(0.4);
  doc.setDrawColor(...HEADER_COLOR);
  doc.roundedRect(14, summaryY, 182, 20, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`Moyenne générale : ${moyennes.moyenne_generale.toFixed(2)} / 20`, 20, summaryY + 8);

  doc.setTextColor(...colorStatut(moyennes.statut));
  doc.text(`Statut : ${labelStatut(moyennes.statut)}`, 20, summaryY + 15);

  // Mention "Document à usage interne"
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(130);
  doc.text('Document à usage interne — Non officiel', 14, summaryY + 28);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Généré le ${format(now, 'dd/MM/yyyy à HH:mm', { locale: fr })}${generatedByName ? ' par ' + generatedByName : ''}`,
    14, summaryY + 34,
  );

  // ---- Sauvegarde ----
  const fileName = `releve-${etudiant.student_number}-${academicYear}.pdf`;
  doc.save(fileName);

  await saveDocumentRecord({
    type: 'releve_notes',
    title: `Relevé de notes — ${etudiant.last_name} ${etudiant.first_name} — ${academicYear}`,
    file_name: fileName,
    department_id: departmentId,
    academic_year: academicYear,
    generated_by_name: generatedByName ?? null,
    related_level: etudiant.level ?? null,
  });
}

// ============================================================
// 2. Liste de résultats complète de la promo
// ============================================================

export async function exportListeResultatsPDF(
  admis: ResultatEtudiant[],
  ajournes: ResultatEtudiant[],
  rattrapage: ResultatEtudiant[],
  exclus: ResultatEtudiant[],
  stats: StatsPromo,
  departmentId: string,
  academicYear: string,
  level?: string,
  generatedByName?: string,
): Promise<void> {
  const doc = new jsPDF();
  const now = new Date();

  // ---- Titre ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des résultats', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (level) doc.text(`Niveau : ${level}`, 14, 26);
  doc.text(`Année universitaire : ${academicYear}`, level ? 110 : 14, 26);
  doc.setLineWidth(0.3);
  doc.line(14, 30, 196, 30);

  // ---- Helper : section (titre + tableau) ----
  const buildBody = (list: ResultatEtudiant[]) =>
    list.map((r, i) => [
      i + 1,
      r.etudiant.student_number,
      r.etudiant.last_name,
      r.etudiant.first_name,
      r.etudiant.group_name ?? '—',
      r.moyenne.toFixed(2),
    ]);

  const sectionHeadColor: Record<string, [number, number, number]> = {
    admis:      [0, 100, 0],
    ajourne:    [160, 0, 0],
    rattrapage: [160, 90, 0],
    exclus:     [80, 80, 80],
  };

  const sections: Array<{
    key: 'admis' | 'ajourne' | 'rattrapage' | 'exclus';
    label: string;
    list: ResultatEtudiant[];
  }> = [
    { key: 'admis',      label: `ADMIS (${admis.length})`,                list: admis },
    { key: 'rattrapage', label: `RATTRAPAGE (${rattrapage.length})`,       list: rattrapage },
    { key: 'ajourne',    label: `AJOURNÉ (${ajournes.length})`,           list: ajournes },
    { key: 'exclus',     label: `EXCLUS / NON CLASSÉS (${exclus.length})`, list: exclus },
  ];

  let cursorY = 35;

  for (const section of sections) {
    if (section.list.length === 0) continue;

    // Titre de section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...sectionHeadColor[section.key]);
    doc.text(section.label, 14, cursorY);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: cursorY + 3,
      head: [['N°', 'Matricule', 'Nom', 'Prénom', 'Groupe', 'Moyenne /20']],
      body: buildBody(section.list),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: {
        fillColor: sectionHeadColor[section.key],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, font: 'courier' },
        4: { cellWidth: 22 },
        5: { cellWidth: 24, halign: 'center', font: 'courier', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const rowList = section.list;
          const moyenne = rowList[data.row.index]?.moyenne ?? null;
          if (moyenne !== null) {
            data.cell.styles.textColor = sectionHeadColor[section.key];
          }
        }
      },
      margin: { top: 10 },
    });

    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY + 20) + 10;

    // Nouvelle page si débordement
    if (cursorY > 255 && section !== sections[sections.length - 1]) {
      doc.addPage();
      cursorY = 14;
    }
  }

  // ---- Stats en pied ----
  const statsY = Math.min(cursorY + 6, 268);

  doc.setLineWidth(0.3);
  doc.setDrawColor(...HEADER_COLOR);
  doc.line(14, statsY, 196, statsY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);

  const col1 = 14;
  const col2 = 80;
  const col3 = 150;
  doc.text(`Total étudiants : ${stats.total_etudiants}`, col1, statsY + 7);
  doc.text(
    `Taux de réussite : ${stats.taux_reussite.toFixed(1)} %`,
    col2, statsY + 7,
  );
  doc.text(
    `Moyenne promo : ${stats.moyenne_promo.toFixed(2)} /20`,
    col3, statsY + 7,
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(130);
  doc.text('Document à usage interne — Non officiel', 14, statsY + 14);
  doc.text(
    `Généré le ${format(now, 'dd/MM/yyyy à HH:mm', { locale: fr })}${generatedByName ? ' par ' + generatedByName : ''}`,
    14, statsY + 19,
  );

  // ---- Sauvegarde ----
  const fileName = `resultats-${level ? level.replace(/\s+/g, '-') + '-' : ''}${academicYear}.pdf`;
  doc.save(fileName);

  await saveDocumentRecord({
    type: 'liste_resultats',
    title: `Liste des résultats${level ? ' — ' + level : ''} — ${academicYear}`,
    file_name: fileName,
    department_id: departmentId,
    academic_year: academicYear,
    generated_by_name: generatedByName ?? null,
    related_level: level ?? null,
  });
}
