import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { Seance, UeInfo, EnseignantInfo, SalleInfo } from "@/pages/emploi-du-temps/EmploiDuTempsPage";
import type { ResponsableClasse } from "./ResponsableFormDialog";

const TIME_SLOTS = [
  { label: "08:00 – 09:30", start: "08:00" },
  { label: "09:45 – 11:15", start: "09:45" },
  { label: "11:30 – 13:00", start: "11:30" },
  { label: "14:00 – 15:30", start: "14:00" },
  { label: "15:45 – 17:15", start: "15:45" },
  { label: "17:30 – 19:00", start: "17:30" },
];

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface ExportParams {
  seances: Seance[];
  ues: UeInfo[];
  enseignants: EnseignantInfo[];
  salles: SalleInfo[];
  weekStart: Date;
  departmentName: string;
  universityName: string;
  responsables: ResponsableClasse[];
  filterGroup?: string;
  logoUrl?: string;            // URL publique du logo université
}

/** Télécharge une image distante et la retourne en base64 DataURL. */
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============================================================
// Métadonnées par cellule (pour didParseCell / didDrawCell)
// ============================================================

interface CellMeta {
  hasCancelled: boolean;
  hasOnline: boolean;
  hasRattrapage: boolean;
  onlineLinks: string[];
}

export async function exportPDF({
  seances, ues, enseignants, salles, weekStart, departmentName, universityName,
  responsables, filterGroup, logoUrl,
}: ExportParams) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const ueMap = new Map(ues.map(u => [u.id, u]));
  const ensMap = new Map(enseignants.map(e => [e.id, e]));
  const salleMap = new Map(salles.map(s => [s.id, s]));

  const weekEnd = addDays(weekStart, 5);
  const title = `Emploi du temps — ${format(weekStart, "d MMM", { locale: fr })} au ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  // ── Logo université ──────────────────────────────────────
  let headerX = 14;      // décalé à droite si logo présent
  const LOGO_SIZE = 18;  // mm

  if (logoUrl) {
    const base64 = await fetchImageBase64(logoUrl);
    if (base64) {
      try {
        // Déterminer le format image
        const fmt = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(base64, fmt, 14, 4, LOGO_SIZE, LOGO_SIZE);
        headerX = 14 + LOGO_SIZE + 4; // décalage texte
      } catch {
        // Ignore — format non supporté (ex: SVG)
      }
    }
  }

  // Header
  doc.setFontSize(10);
  doc.text(universityName, headerX, 12);
  doc.text(`Département : ${departmentName}`, headerX, 17);
  doc.setFontSize(14);
  doc.text(title, 148, 12, { align: "center" });
  if (filterGroup && filterGroup !== "all") {
    doc.setFontSize(10);
    doc.text(`Groupe : ${filterGroup}`, 148, 18, { align: "center" });
  }

  // ---- Build body + cell metadata ----
  const headers = ["Heure", ...DAY_LABELS];
  const body: string[][] = [];

  // cellMeta[rowIdx][colIdx] — colIdx 0 = "Heure" column
  const cellMeta: CellMeta[][] = [];

  for (let rowIdx = 0; rowIdx < TIME_SLOTS.length; rowIdx++) {
    const slot = TIME_SLOTS[rowIdx];
    const row: string[] = [slot.label];
    const rowMeta: CellMeta[] = [
      { hasCancelled: false, hasOnline: false, hasRattrapage: false, onlineLinks: [] }, // heure col
    ];

    for (let d = 0; d < 6; d++) {
      const dateStr = format(addDays(weekStart, d), "yyyy-MM-dd");
      const cellSeances = seances.filter(
        s => s.seance_date === dateStr && s.start_time?.substring(0, 5) === slot.start,
      );

      // --- Build cell metadata ---
      const meta: CellMeta = {
        hasCancelled: false,
        hasOnline: false,
        hasRattrapage: false,
        onlineLinks: [],
      };
      for (const s of cellSeances) {
        if (s.is_cancelled) meta.hasCancelled = true;
        if (s.is_online) {
          meta.hasOnline = true;
          if (s.online_link) meta.onlineLinks.push(s.online_link);
        }
        if (s.type === "rattrapage") meta.hasRattrapage = true;
      }
      rowMeta.push(meta);

      // --- Build cell text ---
      if (cellSeances.length === 0) {
        row.push("");
      } else {
        const parts = cellSeances.map(s => {
          const ue = ueMap.get(s.ue_id);
          const ens = ensMap.get(s.enseignant_id);
          const salle = s.salle_id ? salleMap.get(s.salle_id) : null;

          // Prefix for special states
          let prefix = "";
          if (s.is_cancelled) prefix = "ANNULÉ\n";
          else if (s.type === "rattrapage") prefix = "[R] ";

          let text = `${prefix}${ue?.name || "UE"} (${s.type})`;

          if (ens) text += `\n${ens.first_name} ${ens.last_name}`;

          if (s.is_online) {
            text += `\nEN LIGNE`;
            if (s.online_link) text += `\n${s.online_link}`;
          } else if (salle) {
            text += `\n${salle.name}`;
          }

          text += `\n${s.group_name}`;
          return text;
        });
        row.push(parts.join("\n---\n"));
      }
    }

    body.push(row);
    cellMeta.push(rowMeta);
  }

  // ---- autoTable ----
  autoTable(doc, {
    head: [headers],
    body,
    startY: 24,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8 },
    columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" } },

    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;

      const meta = cellMeta[data.row.index]?.[data.column.index];
      if (!meta) return;

      const text = String(data.cell.raw || "");

      if (meta.hasCancelled) {
        // Fond rouge pâle pour les séances annulées
        data.cell.styles.fillColor = [255, 235, 238]; // #FFEBEE
        data.cell.styles.textColor = [176, 0, 32];
      } else if (meta.hasRattrapage) {
        // Orange pour les séances de rattrapage
        data.cell.styles.fillColor = [255, 237, 213];
        data.cell.styles.textColor = [154, 52, 18];
      } else if (meta.hasOnline) {
        // Bleu ciel pour EN LIGNE
        data.cell.styles.fillColor = [224, 240, 255];
      } else if (text.includes("(CM)")) {
        data.cell.styles.fillColor = [219, 234, 254];
      } else if (text.includes("(TD)")) {
        data.cell.styles.fillColor = [209, 250, 229];
      } else if (text.includes("(TP)")) {
        data.cell.styles.fillColor = [254, 243, 199];
      }
    },

    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;

      const meta = cellMeta[data.row.index]?.[data.column.index];
      if (!meta) return;

      // Trait barré sur les cellules annulées (simulate strikethrough)
      if (meta.hasCancelled) {
        const midY = data.cell.y + data.cell.height / 2;
        doc.setLineWidth(0.4);
        doc.setDrawColor(176, 0, 32);
        doc.line(
          data.cell.x + 1,
          midY,
          data.cell.x + data.cell.width - 1,
          midY,
        );
        doc.setDrawColor(0); // reset
      }

      // Annotations PDF cliquables pour les liens en ligne
      if (meta.hasOnline && meta.onlineLinks.length > 0) {
        // Un seul lien par cellule (premier trouvé)
        doc.link(
          data.cell.x,
          data.cell.y,
          data.cell.width,
          data.cell.height,
          { url: meta.onlineLinks[0] },
        );
      }
    },
  });

  // ---- Footer section ----
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  let yPos = finalY + 8;

  // Responsables
  const relevantResponsables = filterGroup && filterGroup !== "all"
    ? responsables.filter(r => r.group_name === filterGroup)
    : responsables;

  if (relevantResponsables.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Responsable(s) de classe :", 14, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const r of relevantResponsables) {
      let line = `${r.group_name} : ${r.first_name} ${r.last_name}`;
      if (r.whatsapp) line += ` | WhatsApp: ${r.whatsapp}`;
      if (r.email) line += ` | Email: ${r.email}`;
      doc.text(line, 14, yPos);
      yPos += 4;
    }
  }

  // Légende
  yPos += 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Légende :", 14, yPos);
  yPos += 3.5;
  const legendItems = [
    { color: [219, 234, 254] as [number, number, number], label: "CM" },
    { color: [209, 250, 229] as [number, number, number], label: "TD" },
    { color: [254, 243, 199] as [number, number, number], label: "TP" },
    { color: [224, 240, 255] as [number, number, number], label: "En ligne" },
    { color: [255, 237, 213] as [number, number, number], label: "Rattrapage" },
    { color: [255, 235, 238] as [number, number, number], label: "Annulé" },
  ];
  let xLegend = 14;
  for (const item of legendItems) {
    doc.setFillColor(...item.color);
    doc.rect(xLegend, yPos - 2.5, 5, 3.5, "F");
    doc.setTextColor(60);
    doc.text(item.label, xLegend + 6, yPos);
    xLegend += 28;
  }

  // Department info footer
  doc.setTextColor(120);
  doc.text(
    `${departmentName} — ${universityName} | Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
    14, yPos + 6,
  );

  doc.save(`emploi-du-temps-${format(weekStart, "yyyy-MM-dd")}.pdf`);
}

export function exportExcel({
  seances, ues, enseignants, salles, weekStart, departmentName,
}: Omit<ExportParams, "responsables">) {
  import("xlsx").then(XLSX => {
    const ueMap = new Map(ues.map(u => [u.id, u]));
    const ensMap = new Map(enseignants.map(e => [e.id, e]));
    const salleMap = new Map(salles.map(s => [s.id, s]));

    const rows = seances.map(s => {
      const ue = ueMap.get(s.ue_id);
      const ens = ensMap.get(s.enseignant_id);
      const salle = s.salle_id ? salleMap.get(s.salle_id) : null;
      return {
        Date: s.seance_date,
        Début: s.start_time?.substring(0, 5),
        Fin: s.end_time?.substring(0, 5),
        UE: ue?.name || "",
        Type: s.type,
        Statut: s.is_cancelled ? "Annulé" : "Actif",
        Enseignant: ens ? `${ens.first_name} ${ens.last_name}` : "",
        Salle: s.is_online ? "En ligne" : salle?.name || "",
        Lien: s.online_link || "",
        Groupe: s.group_name,
        Notes: s.notes || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Emploi du temps");
    XLSX.writeFile(wb, `emploi-du-temps-${format(weekStart, "yyyy-MM-dd")}.xlsx`);
  });
}
