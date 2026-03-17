/**
 * ImportWizard.tsx
 * Wizard 3 étapes pour importer des notes depuis un fichier Excel.
 * Étape 1 : Upload + choix UE
 * Étape 2 : Prévisualisation avec corrections
 * Étape 3 : Confirmation et upsert en base
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseNotesExcel, type ResultatParsing, type LigneResultat, type StudentInput } from '@/engine/import-notes.engine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types locaux
// ============================================================

interface UeOption {
  id: string;
  name: string;
}

interface Props {
  ues: UeOption[];
  students: StudentInput[];
  departmentId: string;
  academicYear: string;
  sessionType: string;
  onSuccess: () => void;
}

type Etape = 1 | 2 | 3;

// ============================================================
// Badge statut
// ============================================================

function StatutBadge({ statut, confiance }: { statut: LigneResultat['statut']; confiance: number }) {
  if (statut === 'ok')
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1">
        <CheckCircle2 className="h-3 w-3" /> OK
      </Badge>
    );
  if (statut === 'incertain')
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] gap-1">
        <HelpCircle className="h-3 w-3" /> Incertain ({Math.round(confiance * 100)}%)
      </Badge>
    );
  if (statut === 'non_trouve')
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] gap-1">
        <XCircle className="h-3 w-3" /> Non trouvé
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] gap-1">
      <AlertTriangle className="h-3 w-3" /> Note invalide
    </Badge>
  );
}

// ============================================================
// Composant principal
// ============================================================

const ImportWizard: React.FC<Props> = ({
  ues, students, departmentId, academicYear, sessionType, onSuccess,
}) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [etape, setEtape] = useState<Etape>(1);
  const [selectedUeId, setSelectedUeId] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultat, setResultat] = useState<ResultatParsing | null>(null);

  // Pour les corrections manuelles : map index ligne → student corrigé
  const [corrections, setCorrections] = useState<Map<number, StudentInput | null>>(new Map());

  // Dialog correction
  const [correctionDialog, setCorrectionDialog] = useState<{
    ouvert: boolean;
    ligneIndex: number;
    nomExcel: string;
  }>({ ouvert: false, ligneIndex: -1, nomExcel: '' });

  // ---- Étape 1 : sélection du fichier ----
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!selectedUeId) {
        toast.error("Veuillez d'abord sélectionner l'UE cible");
        if (fileRef.current) fileRef.current.value = '';
        return;
      }

      const ue = ues.find(u => u.id === selectedUeId);
      if (!ue) return;

      setParsing(true);
      try {
        const res = await parseNotesExcel(file, students, ue.name);
        setResultat(res);
        setCorrections(new Map());
        setEtape(2);
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier : " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setParsing(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [selectedUeId, ues, students],
  );

  // ---- Ligne effective (avec corrections) ----
  const ligneEffective = useCallback(
    (index: number): LigneResultat => {
      if (!resultat) throw new Error('no result');
      const base = resultat.lignes[index];
      if (corrections.has(index)) {
        const student = corrections.get(index) ?? null;
        return {
          ...base,
          student_match: student,
          statut: student ? 'ok' : 'non_trouve',
          confiance: student ? 1.0 : 0,
        };
      }
      return base;
    },
    [resultat, corrections],
  );

  // ---- Résoudre une incertitude ----
  const ouvrirCorrection = (index: number, nomExcel: string) => {
    setCorrectionDialog({ ouvert: true, ligneIndex: index, nomExcel });
  };

  const appliquerCorrection = (student: StudentInput | null) => {
    setCorrections(prev => {
      const next = new Map(prev);
      next.set(correctionDialog.ligneIndex, student);
      return next;
    });
    setCorrectionDialog({ ouvert: false, ligneIndex: -1, nomExcel: '' });
  };

  // ---- Vérifier si on peut confirmer ----
  const lignesIncertaines = resultat
    ? resultat.lignes.filter((_, i) => ligneEffective(i).statut === 'incertain')
    : [];
  const peutConfirmer = lignesIncertaines.length === 0;

  // ---- Étape 3 : confirmer l'import ----
  const confirmerImport = async () => {
    if (!resultat || !selectedUeId || !departmentId) return;

    setSaving(true);
    setEtape(3);

    const inserts = resultat.lignes
      .map((_, i) => ligneEffective(i))
      .filter(l => l.student_match && l.statut === 'ok')
      .map(l => ({
        department_id: departmentId,
        student_id: l.student_match!.id,
        ue_id: selectedUeId,
        note: l.note_finale,
        session_type: sessionType,
        academic_year: academicYear,
        created_by: user?.id ?? null,
      }));

    if (inserts.length === 0) {
      toast.error('Aucune note valide à importer');
      setSaving(false);
      setEtape(2);
      return;
    }

    const { error } = await supabase
      .from('notes')
      .upsert(inserts as any[], {
        onConflict: 'department_id,student_id,ue_id,session_type,academic_year',
      });

    setSaving(false);

    if (error) {
      toast.error('Erreur lors de l\'import : ' + error.message);
      setEtape(2);
      return;
    }

    toast.success(`${inserts.length} notes importées avec succès.`);
    // Reset
    setEtape(1);
    setResultat(null);
    setSelectedUeId('');
    setCorrections(new Map());
    onSuccess();
  };

  // ---- Reset ----
  const reset = () => {
    setEtape(1);
    setResultat(null);
    setCorrections(new Map());
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-3">
      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {(['Upload', 'Prévisualisation', 'Confirmation'] as const).map((label, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`font-medium ${etape === i + 1 ? 'text-primary' : ''}`}>
              {i + 1}. {label}
            </span>
            {i < 2 && <ChevronRight className="h-3 w-3" />}
          </span>
        ))}
      </div>

      {/* ---- ÉTAPE 1 : Upload ---- */}
      {etape === 1 && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1">
              <Label>1. Sélectionner l'UE cible</Label>
              <Select value={selectedUeId} onValueChange={setSelectedUeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir l'UE" />
                </SelectTrigger>
                <SelectContent>
                  {ues.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>2. Importer le fichier Excel / CSV</Label>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedUeId || parsing}
                onClick={() => fileRef.current?.click()}
                className="w-full"
              >
                {parsing
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyse en cours…</>
                  : <><Upload className="h-4 w-4 mr-2" />Choisir un fichier (.xlsx, .xls, .csv)</>
                }
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- ÉTAPE 2 : Prévisualisation ---- */}
      {etape === 2 && resultat && (
        <div className="space-y-3">
          {/* Message d'analyse */}
          <Alert className={lignesIncertaines.length > 0 ? 'border-orange-400 bg-orange-50' : 'border-emerald-400 bg-emerald-50'}>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription className="text-sm">{resultat.message}</AlertDescription>
          </Alert>

          {/* Stats résumé */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              ✓ {resultat.stats.ok} OK
            </Badge>
            {resultat.stats.incertains > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                ? {resultat.stats.incertains} incertain{resultat.stats.incertains > 1 ? 's' : ''}
              </Badge>
            )}
            {resultat.stats.non_trouves > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                ✗ {resultat.stats.non_trouves} non trouvé{resultat.stats.non_trouves > 1 ? 's' : ''}
              </Badge>
            )}
            {resultat.conversion_sur_100 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                /100 → /20
              </Badge>
            )}
          </div>

          {/* Tableau des lignes */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nom dans le fichier</TableHead>
                    <TableHead className="text-xs">Étudiant identifié</TableHead>
                    <TableHead className="text-center text-xs">Note brute</TableHead>
                    <TableHead className="text-center text-xs">Note /20</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultat.lignes.map((_, index) => {
                    const ligne = ligneEffective(index);
                    const rowClass =
                      ligne.statut === 'ok'
                        ? 'bg-emerald-50/40'
                        : ligne.statut === 'incertain'
                        ? 'bg-orange-50/60'
                        : 'bg-red-50/40';

                    return (
                      <TableRow key={index} className={rowClass}>
                        <TableCell className="text-xs font-mono py-1.5">
                          {ligne.nom_excel}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">
                          {ligne.student_match
                            ? `${ligne.student_match.last_name} ${ligne.student_match.first_name}`
                            : <span className="text-muted-foreground italic">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-center text-xs py-1.5 font-mono">
                          {ligne.note_brute}
                        </TableCell>
                        <TableCell className="text-center text-xs py-1.5 font-medium">
                          {ligne.note_finale !== null ? ligne.note_finale : '—'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <StatutBadge statut={ligne.statut} confiance={ligne.confiance} />
                        </TableCell>
                        <TableCell className="py-1.5">
                          {(ligne.statut === 'incertain' || ligne.statut === 'non_trouve') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => ouvrirCorrection(index, ligne.nom_excel)}
                            >
                              Corriger
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Avertissement incertains */}
          {!peutConfirmer && (
            <Alert variant="destructive" className="text-sm">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Veuillez corriger ou rejeter les {lignesIncertaines.length} correspondance{lignesIncertaines.length > 1 ? 's' : ''} incertaine{lignesIncertaines.length > 1 ? 's' : ''} avant de confirmer.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-1">
            <Button variant="outline" size="sm" onClick={reset}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Recommencer
            </Button>
            <Button
              size="sm"
              disabled={!peutConfirmer || saving}
              onClick={confirmerImport}
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Import en cours…</>
                : <>Confirmer l'import ({resultat.lignes.filter((_, i) => ligneEffective(i).statut === 'ok').length} notes)</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ---- ÉTAPE 3 : Saving ---- */}
      {etape === 3 && saving && (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Enregistrement des notes en base…</p>
          </CardContent>
        </Card>
      )}

      {/* ---- Dialog correction manuelle ---- */}
      <Dialog
        open={correctionDialog.ouvert}
        onOpenChange={(o) => !o && setCorrectionDialog({ ouvert: false, ligneIndex: -1, nomExcel: '' })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Corriger la correspondance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Fichier Excel : <span className="font-medium text-foreground">« {correctionDialog.nomExcel} »</span>
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-600 border-red-300 mb-2"
              onClick={() => appliquerCorrection(null)}
            >
              <XCircle className="h-4 w-4 mr-2" /> Ignorer cette ligne
            </Button>
            {students.map(s => (
              <Button
                key={s.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => appliquerCorrection(s)}
              >
                {s.last_name} {s.first_name}
                <span className="ml-auto text-muted-foreground font-mono">{s.student_number}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportWizard;
