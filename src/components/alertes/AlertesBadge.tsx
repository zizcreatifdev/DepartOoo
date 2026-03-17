/**
 * AlertesBadge.tsx
 * Bouton cloche avec badge rouge indiquant le nombre d'alertes non lues.
 * Visible uniquement pour les rôles chef, assistant et owner.
 */

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AlertesBadgeProps {
  nb_non_lues: number;
  onClick: () => void;
}

const AlertesBadge: React.FC<AlertesBadgeProps> = ({ nb_non_lues, onClick }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
      aria-label={
        nb_non_lues > 0
          ? `${nb_non_lues} alerte${nb_non_lues > 1 ? 's' : ''} non lue${nb_non_lues > 1 ? 's' : ''}`
          : 'Alertes'
      }
    >
      <Bell className="h-4 w-4" />
      {nb_non_lues > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] leading-none flex items-center justify-center pointer-events-none"
        >
          {nb_non_lues > 99 ? '99+' : nb_non_lues}
        </Badge>
      )}
    </Button>
  );
};

export default AlertesBadge;
