import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DepartmentSwitcher from "@/components/enseignant/DepartmentSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Upload, CheckCircle, Clock, AlertTriangle, FileText, Lock, Unlock, CalendarIcon } from "lucide-react";
import { useEnseignantSujets } from "@/hooks/useEnseignantSujets";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  recu: { label: "Reçu", icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "default" },
  en_attente: { label: "En attente", icon: <Clock className="h-3.5 w-3.5" />, variant: "secondary" },
  en_retard: { label: "En retard", icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "destructive" },
};

const EnseignantSujetsPage = () => {
  const {
    enseignant, allProfiles, profileLoading, switchDepartment,
    sujets, loading, uploading,
    handleUpload, toggleLock, setUnlockDate, isAutoUnlocked,
  } = useEnseignantSujets();

  if (profileLoading || loading) {
    return (
      <DashboardLayout title="Mes sujets">
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </DashboardLayout>
    );
  }

  if (!enseignant) {
    return (
      <DashboardLayout title="Mes sujets">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Votre profil enseignant n'est pas encore configuré.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mes sujets">
      <div className="space-y-4">
        <DepartmentSwitcher
          profiles={allProfiles}
          current={enseignant}
          onSwitch={switchDepartment}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Dépôt des sujets d'évaluation
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Déposez vos sujets puis verrouillez-les. Vous pouvez définir une date de déverrouillage automatique ou le faire manuellement.
              <br />
              <strong>Sécurité :</strong> 15 minutes avant l'heure de début de l'examen, le sujet est automatiquement accessible au chef de département.
            </p>
          </CardHeader>
          <CardContent>
            {sujets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun examen planifié pour vos UE.
              </p>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UE</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Date examen</TableHead>
                      <TableHead>Date limite</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead className="text-center">Verrouillage</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sujets.map(s => {
                      const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.en_attente;
                      const autoUnlocked = isAutoUnlocked(s);
                      const effectivelyLocked = s.is_locked && !autoUnlocked;

                      return (
                        <TableRow key={s.examen_id}>
                          <TableCell className="font-medium">{s.examen?.ue_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {s.examen?.session_type === "rattrapage" ? "Rattrapage" : "Normale"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.examen?.exam_date ? format(new Date(s.examen.exam_date), "d MMM yyyy", { locale: fr }) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.deadline ? format(new Date(s.deadline), "d MMM yyyy", { locale: fr }) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={cfg.variant} className="gap-1">
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.file_name || "—"}
                            {s.deposited_at && (
                              <div className="text-[10px]">
                                {format(new Date(s.deposited_at), "d MMM à HH:mm", { locale: fr })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              {s.id ? (
                                <>
                                  <Button
                                    variant={effectivelyLocked ? "destructive" : "outline"}
                                    size="sm"
                                    className="gap-1 text-xs"
                                    onClick={() => toggleLock(s)}
                                    disabled={!s.file_path}
                                  >
                                    {effectivelyLocked ? (
                                      <><Lock className="h-3 w-3" /> Verrouillé</>
                                    ) : (
                                      <><Unlock className="h-3 w-3" /> Déverrouillé</>
                                    )}
                                  </Button>
                                  {autoUnlocked && s.is_locked && (
                                    <span className="text-[10px] text-amber-600 font-medium">Auto-déverrouillé</span>
                                  )}
                                  {effectivelyLocked && (
                                    <UnlockDatePicker
                                      unlockAt={s.unlock_at}
                                      onSet={(date) => setUnlockDate(s.id, date)}
                                    />
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <label className="cursor-pointer">
                              <Button
                                variant={s.status === "recu" ? "outline" : "default"}
                                size="sm"
                                disabled={uploading === s.examen_id}
                                asChild
                              >
                                <span>
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                  {uploading === s.examen_id ? "..." : s.status === "recu" ? "Remplacer" : "Déposer"}
                                </span>
                              </Button>
                              <Input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(s.examen_id, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

/** Small date picker for setting unlock date */
function UnlockDatePicker({ unlockAt, onSet }: { unlockAt: string | null; onSet: (date: string | null) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-6 px-1.5">
          <CalendarIcon className="h-3 w-3" />
          {unlockAt ? format(new Date(unlockAt), "d MMM HH:mm", { locale: fr }) : "Programmer"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        <Calendar
          mode="single"
          selected={unlockAt ? new Date(unlockAt) : undefined}
          onSelect={(date) => {
            if (date) {
              // Set to 00:00 of selected day
              onSet(date.toISOString());
            } else {
              onSet(null);
            }
            setOpen(false);
          }}
          disabled={(date) => date < new Date()}
          locale={fr}
        />
        {unlockAt && (
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => { onSet(null); setOpen(false); }}>
            Supprimer la date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default EnseignantSujetsPage;
