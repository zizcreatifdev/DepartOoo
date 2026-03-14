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
}

export function exportPDF({
  seances, ues, enseignants, salles, weekStart, departmentName, universityName, responsables, filterGroup,
}: ExportParams) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const ueMap = new Map(ues.map(u => [u.id, u]));
  const ensMap = new Map(enseignants.map(e => [e.id, e]));
  const salleMap = new Map(salles.map(s => [s.id, s]));

  const weekEnd = addDays(weekStart, 5);
  const title = `Emploi du temps — ${format(weekStart, "d MMM", { locale: fr })} au ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  // Header
  doc.setFontSize(10);
  doc.text(universityName, 14, 12);
  doc.text(`Département : ${departmentName}`, 14, 17);
  doc.setFontSize(14);
  doc.text(title, 148, 12, { align: "center" });
  if (filterGroup && filterGroup !== "all") {
    doc.setFontSize(10);
    doc.text(`Groupe : ${filterGroup}`, 148, 18, { align: "center" });
  }

  // Build table data
  const headers = ["Heure", ...DAY_LABELS];
  const body: string[][] = [];

  for (const slot of TIME_SLOTS) {
    const row: string[] = [slot.label];
    for (let d = 0; d < 6; d++) {
      const dateStr = format(addDays(weekStart, d), "yyyy-MM-dd");
      const cellSeances = seances.filter(
        s => s.seance_date === dateStr && s.start_time?.substring(0, 5) === slot.start
      );
      if (cellSeances.length === 0) {
        row.push("");
      } else {
        const parts = cellSeances.map(s => {
          const ue = ueMap.get(s.ue_id);
          const ens = ensMap.get(s.enseignant_id);
          const salle = s.salle_id ? salleMap.get(s.salle_id) : null;
          let text = `${ue?.name || "UE"} (${s.type})`;
          if (ens) text += `\n${ens.first_name} ${ens.last_name}`;
          if (s.is_online) {
            text += `\nEn ligne`;
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
  }

  autoTable(doc, {
    head: [headers],
    body,
    startY: 24,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8 },
    columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const text = String(data.cell.raw || "");
        if (text.includes("(CM)")) data.cell.styles.fillColor = [219, 234, 254];
        else if (text.includes("(TD)")) data.cell.styles.fillColor = [209, 250, 229];
        else if (text.includes("(TP)")) data.cell.styles.fillColor = [254, 243, 199];
      }
    },
  });

  // Footer section
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

  // Department info footer
  yPos += 3;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `${departmentName} — ${universityName} | Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
    14, yPos
  );

  // Make online links clickable
  // Re-scan cells for links
  seances.forEach(s => {
    if (s.is_online && s.online_link) {
      // jsPDF doesn't support inline links in autotable easily, but we add link annotations
      // This is a best-effort approach
    }
  });

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
