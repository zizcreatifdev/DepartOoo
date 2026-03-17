/**
 * PipelineTable.tsx
 * Tableau CRUD de la table pipeline_commercial.
 * Ajouter un prospect | Modifier son statut | Ajouter une note | Supprimer
 */

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  addProspect, updatePipelineStatut, updatePipelineNote, deleteProspect,
  type PipelineEntry,
} from '@/services/owner.service';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { Input }   from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Pencil, Loader2, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================================
// Config statuts
// ============================================================

const STATUT_CONFIG: Record<
  PipelineEntry['statut'],
  { label: string; className: string }
> = {
  discussion: { label: 'En discussion', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  demo:       { label: 'En démo',       className: 'bg-blue-100 text-blue-700 border-blue-200' },
  essai:      { label: 'En essai',      className: 'bg-purple-100 text-purple-700 border-purple-200' },
  converti:   { label: 'Converti',      className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  perdu:      { label: 'Perdu',         className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

// ============================================================
// Props
// ============================================================

interface PipelineTableProps {
  entries: PipelineEntry[];
  isLoading?: boolean;
}

// ============================================================
// Composant
// ============================================================

export function PipelineTable({ entries, isLoading }: PipelineTableProps) {
  const queryClient = useQueryClient();

  // ---- Dialog ajout prospect ----
  const [showAdd, setShowAdd]         = useState(false);
  const [newNom, setNewNom]           = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newNote, setNewNote]         = useState('');

  // ---- Dialog note ----
  const [editNoteId, setEditNoteId]   = useState<string | null>(null);
  const [editNoteVal, setEditNoteVal] = useState('');

  // ---- Invalidation commune ----
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['owner-pipeline'] });

  // ---- Mutations ----
  const mutAddProspect = useMutation({
    mutationFn: () => addProspect({ contact_nom: newNom, contact_email: newEmail, note: newNote }),
    onSuccess: () => {
      toast.success('Prospect ajouté');
      setShowAdd(false); setNewNom(''); setNewEmail(''); setNewNote('');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const mutStatut = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: PipelineEntry['statut'] }) =>
      updatePipelineStatut(id, statut),
    onSuccess: () => { toast.success('Statut mis à jour'); invalidate(); },
    onError:   (e: any) => toast.error(e.message),
  });

  const mutNote = useMutation({
    mutationFn: () => {
      if (!editNoteId) return Promise.resolve();
      return updatePipelineNote(editNoteId, editNoteVal);
    },
    onSuccess: () => {
      toast.success('Note enregistrée');
      setEditNoteId(null); setEditNoteVal('');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const mutDelete = useMutation({
    mutationFn: (id: string) => deleteProspect(id),
    onSuccess: () => { toast.success('Prospect supprimé'); invalidate(); },
    onError:   (e: any) => toast.error(e.message),
  });

  // ---- Stats pipeline ----
  const byStatut = Object.keys(STATUT_CONFIG).reduce<Record<string, number>>(
    (acc, k) => { acc[k] = entries.filter(e => e.statut === k).length; return acc; },
    {},
  );
  const total    = entries.length;
  const convertis = byStatut.converti ?? 0;
  const essais    = byStatut.essai ?? 0;
  const txConversion = essais > 0 ? Math.round((convertis / (essais + convertis)) * 100) : 0;

  // ============================================================
  // Rendu
  // ============================================================

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Pipeline commercial</CardTitle>
            <Badge variant="outline" className="text-xs">{total} prospect{total > 1 ? 's' : ''}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter un prospect
          </Button>
        </CardHeader>

        {/* Mini stats par statut */}
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <Badge className={`text-[10px] border ${cfg.className}`}>{cfg.label}</Badge>
              <span className="text-xs font-semibold text-foreground">{byStatut[key] ?? 0}</span>
            </div>
          ))}
          {essais + convertis > 0 && (
            <span className="text-xs text-muted-foreground ml-auto self-center">
              Taux de conversion : <strong>{txConversion}%</strong>
            </span>
          )}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">
              Aucun prospect pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Dernière action</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    {/* Contact */}
                    <TableCell className="font-medium text-sm">
                      {entry.contact_nom ?? '—'}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.contact_email
                        ? <a href={`mailto:${entry.contact_email}`} className="hover:underline">{entry.contact_email}</a>
                        : '—'}
                    </TableCell>

                    {/* Statut — Select inline */}
                    <TableCell>
                      <Select
                        value={entry.statut}
                        onValueChange={(v) =>
                          mutStatut.mutate({ id: entry.id, statut: v as PipelineEntry['statut'] })
                        }
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <SelectValue>
                            <Badge
                              className={`text-[10px] border ${STATUT_CONFIG[entry.statut]?.className}`}
                            >
                              {STATUT_CONFIG[entry.statut]?.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUT_CONFIG).map(([v, cfg]) => (
                            <SelectItem key={v} value={v} className="text-xs">
                              {cfg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Note */}
                    <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                      <span className="block truncate" title={entry.note ?? undefined}>
                        {entry.note || <span className="italic">Aucune note</span>}
                      </span>
                    </TableCell>

                    {/* Dernière action */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {entry.derniere_action
                        ? format(parseISO(entry.derniere_action), 'dd/MM/yyyy', { locale: fr })
                        : '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Modifier la note */}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title="Modifier la note"
                          onClick={() => { setEditNoteId(entry.id); setEditNoteVal(entry.note ?? ''); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {/* Supprimer */}
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Supprimer"
                          onClick={() => {
                            if (confirm(`Supprimer ${entry.contact_nom ?? 'ce prospect'} ?`)) {
                              mutDelete.mutate(entry.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ============================================================
          Dialog : Ajouter un prospect
      ============================================================ */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
            <DialogDescription>
              Ajouter un prospect au pipeline commercial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom du contact *</label>
              <Input
                placeholder="Dr. Amadou Konaté"
                value={newNom}
                onChange={e => setNewNom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="a.konate@universite.ml"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note initiale</label>
              <Textarea
                rows={2}
                placeholder="Contexte, besoins, prochaine étape…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button
                disabled={!newNom.trim() || mutAddProspect.isPending}
                onClick={() => mutAddProspect.mutate()}
              >
                {mutAddProspect.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Ajout…</>
                  : <><Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          Dialog : Modifier la note
      ============================================================ */}
      <Dialog open={!!editNoteId} onOpenChange={o => { if (!o) setEditNoteId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Textarea
              rows={4}
              placeholder="Contexte, besoins, prochaine étape…"
              value={editNoteVal}
              onChange={e => setEditNoteVal(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditNoteId(null)}>Annuler</Button>
              <Button
                disabled={mutNote.isPending}
                onClick={() => mutNote.mutate()}
              >
                {mutNote.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Sauvegarde…</>
                  : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
