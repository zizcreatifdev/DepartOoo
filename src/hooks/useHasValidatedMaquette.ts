import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useHasValidatedMaquette() {
  const { department } = useAuth();
  const [hasValidated, setHasValidated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!department?.id) {
      setHasValidated(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data, error } = await supabase
        .from("maquettes")
        .select("id")
        .eq("department_id", department.id)
        .eq("status", "validee")
        .limit(1);

      if (error) {
        console.error("Error checking maquette validation:", error);
        setHasValidated(false);
      } else {
        setHasValidated(data && data.length > 0);
      }
      setLoading(false);
    };

    check();
  }, [department?.id]);

  return { hasValidated, loading };
}
