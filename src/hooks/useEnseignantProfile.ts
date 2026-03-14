import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface EnseignantProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: "permanent" | "vacataire";
  quota_hours: number;
  allocated_hours: number;
  hours_done: number;
  hourly_rate: number;
  is_active: boolean;
  department_id: string;
  user_id: string | null;
  vacation_start: string | null;
  vacation_end: string | null;
}

export interface EnseignantProfileWithDept extends EnseignantProfile {
  department_name?: string;
}

export function useEnseignantProfile() {
  const { user } = useAuth();
  const [enseignant, setEnseignant] = useState<EnseignantProfileWithDept | null>(null);
  const [allProfiles, setAllProfiles] = useState<EnseignantProfileWithDept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("enseignants")
        .select("*")
        .eq("user_id", user.id);

      const profiles = (data as EnseignantProfile[] | null) || [];

      if (profiles.length > 0) {
        // Fetch department names
        const deptIds = [...new Set(profiles.map(p => p.department_id))];
        const { data: depts } = await supabase
          .from("departments")
          .select("id, name")
          .in("id", deptIds);
        const deptMap = new Map((depts || []).map(d => [d.id, d.name]));

        const enriched: EnseignantProfileWithDept[] = profiles.map(p => ({
          ...p,
          department_name: deptMap.get(p.department_id) || "Département",
        }));

        setAllProfiles(enriched);
        setEnseignant(enriched[0]);
      } else {
        setAllProfiles([]);
        setEnseignant(null);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const switchDepartment = (departmentId: string) => {
    const profile = allProfiles.find(p => p.department_id === departmentId);
    if (profile) setEnseignant(profile);
  };

  return { enseignant, allProfiles, loading, switchDepartment };
}
