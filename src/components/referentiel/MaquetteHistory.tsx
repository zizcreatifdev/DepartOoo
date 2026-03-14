import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User } from "lucide-react";

interface HistoryEntry {
  id: string;
  user_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

interface Props {
  maquetteId: string;
  onBack: () => void;
}

const MaquetteHistory: React.FC<Props> = ({ maquetteId, onBack }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("maquette_history")
        .select("*")
        .eq("maquette_id", maquetteId)
        .order("created_at", { ascending: false });
      setEntries(data || []);
    };
    fetchHistory();
  }, [maquetteId]);

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Historique des modifications</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucun historique disponible.</p>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="flex gap-4 border-l-2 border-primary/30 pl-4 pb-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <User className="h-3 w-3" />
                        {entry.user_name || "Utilisateur inconnu"}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>{entry.action}</span>
                    </div>
                    {entry.details && (
                      <p className="text-sm text-muted-foreground">{entry.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaquetteHistory;
