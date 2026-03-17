/**
 * BoutonWhatsApp.tsx
 * Bouton qui ouvre un lien wa.me dans un nouvel onglet.
 * Utilisable dans EnseignantsList, SujetsTracker, etc.
 *
 * Props :
 *   numero  - Numéro international (ex: "+213555123456")
 *   message - Message pré-rempli (encodé automatiquement)
 *   label   - Texte optionnel du bouton (défaut: "WhatsApp")
 *   size    - "sm" | "default" (défaut: "sm")
 */

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { genererLienWhatsApp } from '@/services/notifications.service';

interface BoutonWhatsAppProps {
  numero: string;
  message: string;
  label?: string;
  size?: 'sm' | 'default';
  className?: string;
}

const BoutonWhatsApp: React.FC<BoutonWhatsAppProps> = ({
  numero,
  message,
  label = 'WhatsApp',
  size = 'sm',
  className = '',
}) => {
  if (!numero) return null;

  const handleClick = () => {
    const url = genererLienWhatsApp(numero, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleClick}
      className={`gap-1.5 border-green-400 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-500 ${className}`}
      title={`Envoyer un message WhatsApp à ${numero}`}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Button>
  );
};

export default BoutonWhatsApp;
