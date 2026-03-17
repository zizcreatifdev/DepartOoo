/**
 * ReglesCalculForm.tsx
 * Formulaire de configuration des règles de calcul des notes (chef uniquement).
 * Modifie la table notes_config pour le département.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  departmentId: string;
  /** Config actuelle (déjà chargée dans NotesPage) */
  config: {
    passing_grade: number;
    compensation_enabled: boolean;
    compensation_threshold: number;
  };
  onSaved: (updated: Props['config']) => void;
}

const ReglesCalculForm: React.FC<Props> = ({ departmentId, config, onSaved }) => {
  const [passingGrade, setPassingGrade] = useState(config.passing_grade);
  const [compensationEnabled, setCompensationEnabled] = useState(config.compensation_enabled);
  const [compensationThreshold, setCompensationThreshold] = useState(config.compensation_threshold);
  const [saving, setSaving] = useState(false);

  // Sync si la config parent change
  useEffect(() => {
    setPassingGrade(config.passing_grade);
    setCompensationEnabled(config.compensation_enabled);
    setCompensationThreshold(config.compensation_threshold);
  }, [config]);

  const handleSave = async () => {
    if (passingGrade < 0 || passingGrade > 20) {
      toast.error('La note de passage doit être entre 0 et 20');
      return;
    }
    if (compensationEnabled && (compensationThreshold < 0 || compensationThreshold > 20)) {
      toast.error('Le seuil de compensation doit être entre 0 et 20');
      return;
    }

    setSaving(true);

    const payload = {
      department_id: departmentId,
      passing_grade: passingGrade,
      compensation_enabled: compensationEnabled,
      compensation_threshold: compensationThreshold,
    };

    const { error } = await supabase
      .from('notes_config')
      .upsert(payload, { onConflict: 'department_id' });

    setSaving(false);

    if (error) {
      toast.error('Erreur lors de la sauvegarde : ' + error.message);
      return;
    }

    toast.success('Règles de calcul mises à jour');
    onSaved({
      passing_grade: passingGrade,
      compensation_enabled: compensationEnabled,
      compensation_threshold: compensationThreshold,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Règles de calcul
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Note de passage */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Note de passage (/ 20)</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={passingGrade}
              onChange={e => setPassingGrade(parseFloat(e.target.value) || 10)}
              className="h-8 text-sm"
            />
          </div>

          {/* Compensation toggle */}
          <div className="space-y-1">
            <Label className="text-xs">Compensation</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={compensationEnabled}
                onCheckedChange={setCompensationEnabled}
                id="compensation-toggle"
              />
              <Label htmlFor="compensation-toggle" className="text-xs cursor-pointer">
                {compensationEnabled ? 'Activée' : 'Désactivée'}
              </Label>
            </div>
          </div>
        </div>

        {/* Seuil de compensation (visible seulement si activé) */}
        {compensationEnabled && (
          <div className="space-y-1">
            <Label className="text-xs">
              Seuil de compensation (/ 20)
              <span className="text-muted-foreground ml-1">
                — si la moyenne ≥ ce seuil, toutes les UEs sont validées
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={compensationThreshold}
              onChange={e => setCompensationThreshold(parseFloat(e.target.value) || 10)}
              className="h-8 text-sm max-w-[120px]"
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</>
              : 'Enregistrer les règles'
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReglesCalculForm;
