/**
 * AlertesPanel.tsx
 * Panneau latéral (Sheet shadcn/ui) listant les alertes non lues.
 * Chaque alerte affiche une icône selon son type, le message, la date et
 * un bouton "Marquer lue".
 */

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  Ban,
  Clock,
  FileText,
  CreditCard,
  BellOff,
  CheckCheck,
  Check,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Alerte } from '@/services/alertes.service';

// ============================================================
// Config icônes / couleurs par type d'alerte
// ============================================================

interface AlerteStyle {
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  borderClass: string;
  bgClass: string;
}

const ALERTE_STYLES: Record<string, AlerteStyle> = {
  absence_proche_seuil: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-500',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50',
  },
  exclusion_automatique: {
    Icon: Ban,
    iconClass: 'text-red-500',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-50',
  },
  heures_rattraper: {
    Icon: Clock,
    iconClass: 'text-blue-500',
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-50',
  },
  sujet_retard: {
    Icon: FileText,
    iconClass: 'text-red-500',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-50',
  },
  licence_expiration: {
    Icon: CreditCard,
    iconClass: 'text-amber-500',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50',
  },
};

const DEFAULT_STYLE: AlerteStyle = {
  Icon: AlertTriangle,
  iconClass: 'text-gray-400',
  borderClass: 'border-gray-200',
  bgClass: 'bg-gray-50',
};

function getStyle(type: string): AlerteStyle {
  return ALERTE_STYLES[type] ?? DEFAULT_STYLE;
}

function labelType(type: string): string {
  const labels: Record<string, string> = {
    absence_proche_seuil:  'Seuil d\'absence approché',
    exclusion_automatique: 'Exclusion automatique',
    heures_rattraper:      'Heures à rattraper',
    sujet_retard:          'Sujet en retard',
    licence_expiration:    'Expiration de licence',
  };
  return labels[type] ?? type;
}

// ============================================================
// Props
// ============================================================

interface AlertesPanelProps {
  open: boolean;
  onClose: () => void;
  alertes: Alerte[];
  nb_non_lues: number;
  onMarquerLue: (id: string) => void;
  onMarquerToutesLues: () => void;
}

// ============================================================
// Composant
// ============================================================

const AlertesPanel: React.FC<AlertesPanelProps> = ({
  open,
  onClose,
  alertes,
  nb_non_lues,
  onMarquerLue,
  onMarquerToutesLues,
}) => {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
        {/* ---- Header ---- */}
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base">Alertes</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {nb_non_lues > 0
                  ? `${nb_non_lues} alerte${nb_non_lues > 1 ? 's' : ''} non lue${nb_non_lues > 1 ? 's' : ''}`
                  : 'Aucune alerte non lue'}
              </SheetDescription>
            </div>
            {nb_non_lues > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={onMarquerToutesLues}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* ---- Liste ---- */}
        <ScrollArea className="flex-1">
          {alertes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
              <BellOff className="h-10 w-10 opacity-30" />
              <p className="text-sm">Aucune alerte non lue</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {alertes.map((alerte) => {
                const { Icon, iconClass, borderClass, bgClass } = getStyle(alerte.type);
                return (
                  <div
                    key={alerte.id}
                    className={`rounded-lg border p-3 flex gap-3 items-start ${bgClass} ${borderClass}`}
                  >
                    {/* Icône */}
                    <div className="shrink-0 mt-0.5">
                      <Icon className={`h-4 w-4 ${iconClass}`} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-0.5">
                        {labelType(alerte.type)}
                      </p>
                      <p className="text-sm text-foreground leading-snug">
                        {alerte.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {format(parseISO(alerte.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => onMarquerLue(alerte.id)}
                      className="shrink-0 mt-0.5 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
                      title="Marquer comme lue"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AlertesPanel;
