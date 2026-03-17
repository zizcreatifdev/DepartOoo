/**
 * SujetsTracker.tsx
 * Tableau de suivi du dépôt des sujets d'examens.
 * - Statut calculé depuis deadline + file_path
 * - Upload vers Supabase Storage (bucket examen-sujets)
 * - Lien WhatsApp de rappel pour l'enseignant
 */

import { useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, Upload, MessageCircle, Download, Lock, Unlock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  examens: any[];
  canEdit: boolean;
  departmentId: string;
  academicYear: string;
  onRefresh: () => void;
}

// ============================================================
// Helpers statut
// ============================================================

function getSujetStatus(ex: any): 'recu' | 'en_retard' | 'en_attente' {
  const sujet = ex.examen_sujets?.[0];
  if (!sujet) return 'en_attente';
  if (sujet.file_path) return 'recu';
  if (sujet.deadline && new Date(sujet.deadline) < new Date()) return 'en_retard';
  return 'en_attente';
}

function isAutoUnlocked(ex: any): boolean {
  const sujet = ex.examen_sujets?.[0];
  if (!sujet?.file_path) return false;
  if (sujet.unlock_at && new Date(sujet.unlock_at) <= new Date()) return true;
  // 15 min avant le début de l'examen
  const examStart = new Date(`${ex.exam_date}T${ex.start_time}`);
  examStart.setMinutes(examStart.getMinutes() - 15);
  return new Date() >= examStart;
}

const STATUS_CONFIG = {
  recu:       { label: 'Reçu',       icon: CheckCircle,    className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  en_attente: { label: 'En attente', icon: Clock,          className: 'bg-amber-100 text-amber-800 border-amber-300' },
  en_retard:  { label: 'En retard',  icon: AlertTriangle,  className: 'bg-red-100 text-red-800 border-red-300' },
} as const;

// ============================================================
// Composant principal
// ============================================================

const SujetsTracker: React.FC<Props> = ({
  examens, canEdit, departmentId, academicYear, onRefresh,
}) => {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ examenId: string; sujetId: string | null } | null>(null);

  // ---- Upload ----

  const handleUploadClick = (examen: any) => {
    const sujet = examen.examen_sujets?.[0];
    uploadTargetRef.current = { examenId: examen.id, sujetId: sujet?.id ?? null };
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current;
    if (!file || !target) return;

    // Reset input for re-use
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploadingId(target.examenId);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const filePath = `${departmentId}/${academicYear}/${Date.now()}_${file.name}`;

      // Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('examen-sujets')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const now = new Date().toISOString();

      if (target.sujetId) {
        // Mise à jour d'un sujet existant
        const { error } = await supabase
          .from('examen_sujets')
          .update({
            file_path: filePath,
            file_name: file.name,
            status: 'recu',
            deposited_at: now,
            deposited_by: userId,
          })
          .eq('id', target.sujetId);
        if (error) throw error;
      } else {
        // Création d'un nouveau sujet
        const { error } = await supabase.from('examen_sujets').insert({
          examen_id: target.examenId,
          file_path: filePath,
          file_name: file.name,
          status: 'recu',
          deposited_at: now,
          deposited_by: userId,
        });
        if (error) throw error;
      }

      toast.success(`Sujet « ${file.name} » déposé avec succès`);
      onRefresh();
    } catch (err: any) {
      toast.error('Erreur lors du dépôt : ' + (err.message || err));
    } finally {
      setUploadingId(null);
      uploadTargetRef.current = null;
    }
  };

  // ---- Téléchargement ----

  const handleDownload = async (sujet: any) => {
    if (!sujet?.file_path) return;
    const { data } = await supabase.storage
      .from('examen-sujets')
      .createSignedUrl(sujet.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Impossible de télécharger le fichier');
  };

  // ---- Rappel WhatsApp ----

  const handleRappel = (ex: any) => {
    const ueName = ex.unites_enseignement?.name || 'UE';
    const sujet = ex.examen_sujets?.[0];
    const deadline = sujet?.deadline
      ? format(new Date(sujet.deadline), 'd MMMM yyyy', { locale: fr })
      : 'la date limite';
    const examDate = format(new Date(ex.exam_date), 'd MMMM yyyy', { locale: fr });

    // Chercher le premier enseignant surveillant (pour le nom)
    const premierSurveillant = ex.examen_surveillants?.[0]?.enseignants;
    const nomEns = premierSurveillant
      ? `${premierSurveillant.first_name} ${premierSurveillant.last_name}`
      : 'Monsieur/Madame';

    // Construire le message de rappel
    const message = encodeURIComponent(
      `Bonjour ${nomEns},\n\n` +
      `Nous vous rappelons que le sujet d'examen pour l'UE « ${ueName} » ` +
      `(examen le ${examDate}) doit être déposé avant le ${deadline}.\n\n` +
      `Merci de le transmettre dès que possible.\n\nCordialement.`,
    );

    // Utiliser le numéro de téléphone si disponible
    const phone: string | undefined = premierSurveillant?.phone;
    const waUrl = phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  };

  if (examens.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Aucun examen planifié.
      </p>
    );
  }

  return (
    <>
      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.zip"
        onChange={handleFileChange}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">UE</TableHead>
            <TableHead className="text-xs">Session</TableHead>
            <TableHead className="text-xs">Date examen</TableHead>
            <TableHead className="text-xs">Deadline sujet</TableHead>
            <TableHead className="text-xs">Statut</TableHead>
            <TableHead className="text-xs">Accès</TableHead>
            <TableHead className="text-xs">Fichier</TableHead>
            <TableHead className="text-xs">Déposé le</TableHead>
            <TableHead className="w-[140px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {examens.map(ex => {
            const sujet = ex.examen_sujets?.[0];
            const status = getSujetStatus(ex);
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            const autoUnlocked = isAutoUnlocked(ex);
            const isLocked = sujet?.is_locked ?? true;
            const accessible = sujet?.file_path && (!isLocked || autoUnlocked);
            const isUploading = uploadingId === ex.id;

            return (
              <TableRow key={ex.id}>
                <TableCell className="font-medium text-sm">
                  {ex.unites_enseignement?.name || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {ex.session_type === 'normale' ? 'Normale' : 'Rattrapage'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {format(new Date(ex.exam_date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="text-xs">
                  {sujet?.deadline
                    ? format(new Date(sujet.deadline), 'dd/MM/yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] gap-1 ${cfg.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sujet?.file_path ? (
                    <Badge
                      variant={accessible ? 'default' : 'secondary'}
                      className="text-[10px] gap-1"
                    >
                      {accessible
                        ? <Unlock className="h-3 w-3" />
                        : <Lock className="h-3 w-3" />}
                      {accessible
                        ? (autoUnlocked ? 'Auto' : 'Accessible')
                        : 'Verrouillé'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs max-w-[120px] truncate">
                  {sujet?.file_name || '—'}
                </TableCell>
                <TableCell className="text-xs">
                  {sujet?.deposited_at
                    ? format(new Date(sujet.deposited_at), 'dd/MM/yyyy HH:mm')
                    : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    {/* Télécharger */}
                    {accessible && sujet?.file_path && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDownload(sujet)}
                        title="Télécharger le sujet"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Déposer (assistant / chef seulement) */}
                    {canEdit && !sujet?.file_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleUploadClick(ex)}
                        disabled={isUploading}
                        title="Déposer le sujet"
                      >
                        {isUploading
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Upload className="h-3.5 w-3.5 mr-1" />}
                        {isUploading ? '' : 'Déposer'}
                      </Button>
                    )}

                    {/* Rappel WhatsApp (si pas encore reçu) */}
                    {canEdit && status !== 'recu' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600"
                        onClick={() => handleRappel(ex)}
                        title="Envoyer un rappel WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

export default SujetsTracker;
