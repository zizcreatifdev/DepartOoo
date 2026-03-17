/**
 * import-notes.engine.ts
 * Parseur intelligent d'import de notes depuis Excel/CSV
 * avec fuzzy matching Fuse.js sur les noms d'étudiants.
 */

import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';

// ============================================================
// Types publics
// ============================================================

export interface StudentInput {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
}

export type StatutLigne = 'ok' | 'incertain' | 'non_trouve' | 'note_invalide';

export interface LigneResultat {
  /** Texte brut du nom tel qu'il apparaît dans le fichier */
  nom_excel: string;
  student_match: StudentInput | null;
  /** Confiance entre 0 et 1 (1 = certitude absolue) */
  confiance: number;
  note_brute: string;
  note_finale: number | null;
  statut: StatutLigne;
}

export interface ResultatParsing {
  feuilles: string[];
  feuille_active: string;
  colonnes: {
    nom?: string;
    prenom?: string;
    matricule?: string;
    note?: string;
  };
  conversion_sur_100: boolean;
  lignes: LigneResultat[];
  stats: {
    total: number;
    ok: number;
    incertains: number;
    non_trouves: number;
    sans_note: number;
  };
  message: string;
}

// ============================================================
// Constantes de détection
// ============================================================

const NOM_PATTERNS = /^(nom|last[\s_-]?name|surname|nom[\s_-]?[eé]tudiant)$/i;
const PRENOM_PATTERNS = /^(pr[eé]nom|first[\s_-]?name)$/i;
const MATRICULE_PATTERNS = /^(num[eé]ro|n[°o]|matricule|id|n[°o][\s_-]?[eé]tudiant|code|student[\s_-]?id)$/i;
const NOTE_PATTERNS = /^(note|score|r[eé]sultat|moyenne|note\/20|\/20|mark)$/i;

const VALEURS_ABSENTES = new Set(['abs', '-', '/', '', 'nd', 'nr', 'absent', 'absent(e)', 'n/a', 'na']);

const CONFIANCE_OK = 0.80;          // >= 80% → statut ok
const CONFIANCE_INCERTAIN = 0.50;   // entre 50% et 80% → incertain

// ============================================================
// Helpers
// ============================================================

function detecterColonne(
  headers: string[],
  pattern: RegExp,
): string | undefined {
  return headers.find((h) => pattern.test(h.trim()));
}

function normaliserNote(
  valeur: unknown,
  surCent: boolean,
): { note_finale: number | null; statut: StatutLigne; note_brute: string } {
  const brut = String(valeur ?? '').trim();

  if (VALEURS_ABSENTES.has(brut.toLowerCase())) {
    return { note_finale: null, statut: 'ok', note_brute: brut || 'vide' };
  }

  // Remplacer la virgule par un point
  const num = parseFloat(brut.replace(',', '.'));

  if (Number.isNaN(num)) {
    return { note_finale: null, statut: 'note_invalide', note_brute: brut };
  }

  if (num < 0 || num > 100) {
    return { note_finale: null, statut: 'note_invalide', note_brute: brut };
  }

  const noteSur20 = surCent ? parseFloat((num / 5).toFixed(2)) : num;
  return { note_finale: noteSur20, statut: 'ok', note_brute: brut };
}

function construireIndexFuse(students: StudentInput[]): Fuse<StudentInput> {
  return new Fuse(students, {
    keys: ['last_name', 'first_name', 'student_number'],
    threshold: 0.4,          // 0=exact, 1=tout accepter → 0.4 = assez tolérant
    includeScore: true,
    ignoreLocation: true,
    useExtendedSearch: false,
  });
}

/**
 * Cherche un étudiant par matricule exact, puis par nom fuzzy.
 * Retourne { student, confiance }.
 */
function matcherEtudiant(
  nomExcel: string,
  prenomExcel: string,
  matriculeExcel: string,
  students: StudentInput[],
  fuse: Fuse<StudentInput>,
): { student: StudentInput | null; confiance: number } {
  // 1. Exact par matricule
  if (matriculeExcel) {
    const exact = students.find(
      (s) => s.student_number.trim() === matriculeExcel.trim(),
    );
    if (exact) return { student: exact, confiance: 1.0 };
  }

  // 2. Fuzzy sur nom + prénom combinés
  const termeRecherche = `${nomExcel} ${prenomExcel}`.trim();
  if (!termeRecherche) return { student: null, confiance: 0 };

  const resultats = fuse.search(termeRecherche);
  if (resultats.length === 0) return { student: null, confiance: 0 };

  const meilleur = resultats[0];
  // Fuse score : 0 = parfait, 1 = nul → confiance = 1 - score
  const confiance = meilleur.score !== undefined ? 1 - meilleur.score : 0.5;

  if (confiance < CONFIANCE_INCERTAIN) return { student: null, confiance };

  return { student: meilleur.item, confiance };
}

// ============================================================
// Fonction principale
// ============================================================

export async function parseNotesExcel(
  file: File,
  students: StudentInput[],
  ue_name: string,
): Promise<ResultatParsing> {
  // --- Lecture du fichier ---
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const feuilles = wb.SheetNames;
  const feuille_active = feuilles[0];

  if (feuilles.length > 1) {
    // On retourne un résultat partiel signalant les feuilles disponibles
    // Le composant demandera à l'utilisateur de choisir (via prop onChooseFeuille)
  }

  const ws = wb.Sheets[feuille_active];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    defval: null,
    raw: false,  // tout en string pour détecter "ABS" etc.
  });

  if (rows.length === 0) {
    return {
      feuilles,
      feuille_active,
      colonnes: {},
      conversion_sur_100: false,
      lignes: [],
      stats: { total: 0, ok: 0, incertains: 0, non_trouves: 0, sans_note: 0 },
      message: 'Le fichier est vide ou ne contient pas de lignes de données.',
    };
  }

  // --- Détection des colonnes ---
  const headers = Object.keys(rows[0]);
  const colonnes = {
    nom:       detecterColonne(headers, NOM_PATTERNS),
    prenom:    detecterColonne(headers, PRENOM_PATTERNS),
    matricule: detecterColonne(headers, MATRICULE_PATTERNS),
    note:      detecterColonne(headers, NOTE_PATTERNS),
  };

  // Si pas de colonne note détectée, essayer la dernière colonne numérique
  if (!colonnes.note) {
    colonnes.note = headers.findLast((h) => {
      const vals = rows.slice(0, 5).map(r => r[h]);
      return vals.some(v => v !== null && !isNaN(Number(String(v).replace(',', '.'))));
    });
  }

  // --- Détecter si les notes sont sur 100 ---
  let valeurMax = 0;
  if (colonnes.note) {
    rows.forEach((r) => {
      const v = parseFloat(String(r[colonnes.note!] ?? '').replace(',', '.'));
      if (!isNaN(v) && v > valeurMax) valeurMax = v;
    });
  }
  const conversion_sur_100 = valeurMax > 20;

  // --- Index Fuse.js ---
  const fuse = construireIndexFuse(students);

  // --- Parsing ligne par ligne ---
  const lignes: LigneResultat[] = [];

  for (const row of rows) {
    const nomVal      = colonnes.nom       ? String(row[colonnes.nom] ?? '').trim() : '';
    const prenomVal   = colonnes.prenom    ? String(row[colonnes.prenom] ?? '').trim() : '';
    const matriculeVal = colonnes.matricule ? String(row[colonnes.matricule] ?? '').trim() : '';

    // Ignorer les lignes sans aucune donnée identifiable
    if (!nomVal && !prenomVal && !matriculeVal) continue;

    // Ignorer les lignes totaux / sous-titres
    if (/^(total|moyenne|sous[\s-]?total|moy)/i.test(nomVal)) continue;

    const nomExcel = [nomVal, prenomVal].filter(Boolean).join(' ') || matriculeVal;

    // Note brute
    const noteRaw = colonnes.note ? row[colonnes.note] : null;
    const { note_finale, statut: statutNote, note_brute } = normaliserNote(
      noteRaw,
      conversion_sur_100,
    );

    // Matching étudiant
    const { student, confiance } = matcherEtudiant(
      nomVal,
      prenomVal,
      matriculeVal,
      students,
      fuse,
    );

    // Statut final
    let statut: StatutLigne;
    if (statutNote === 'note_invalide') {
      statut = 'note_invalide';
    } else if (!student) {
      statut = 'non_trouve';
    } else if (confiance >= CONFIANCE_OK) {
      statut = 'ok';
    } else {
      statut = 'incertain';
    }

    lignes.push({
      nom_excel: nomExcel,
      student_match: student,
      confiance,
      note_brute,
      note_finale,
      statut,
    });
  }

  // --- Statistiques ---
  const stats = {
    total:       lignes.length,
    ok:          lignes.filter(l => l.statut === 'ok').length,
    incertains:  lignes.filter(l => l.statut === 'incertain').length,
    non_trouves: lignes.filter(l => l.statut === 'non_trouve').length,
    sans_note:   lignes.filter(l => l.note_finale === null).length,
  };

  // --- Message en français naturel ---
  const parties: string[] = [];

  if (feuilles.length > 1) {
    parties.push(
      `Ce fichier contient ${feuilles.length} feuilles. La première (« ${feuille_active} ») a été utilisée.`,
    );
  }

  if (conversion_sur_100) {
    parties.push('Les notes semblent être sur 100 — converties en /20 automatiquement.');
  }

  const trouves = stats.ok + stats.incertains;
  if (stats.non_trouves > 0) {
    parties.push(
      `On a trouvé ${trouves} étudiant${trouves > 1 ? 's' : ''} sur ${stats.total}. ` +
      `${stats.non_trouves} nom${stats.non_trouves > 1 ? 's' : ''} n'on${stats.non_trouves > 1 ? 't' : 'a'} pas pu être identifié${stats.non_trouves > 1 ? 's' : ''}.`,
    );
  } else {
    parties.push(
      `${trouves} étudiant${trouves > 1 ? 's' : ''} identifié${trouves > 1 ? 's' : ''} pour ${ue_name}.`,
    );
  }

  if (stats.incertains > 0) {
    parties.push(
      `${stats.incertains} correspondance${stats.incertains > 1 ? 's' : ''} incertaine${stats.incertains > 1 ? 's' : ''} — veuillez vérifier avant de confirmer.`,
    );
  }

  return {
    feuilles,
    feuille_active,
    colonnes,
    conversion_sur_100,
    lignes,
    stats,
    message: parties.join(' '),
  };
}
