import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnseignantProfile } from "@/hooks/useEnseignantProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface ExamenSujet {
  id: string;
  examen_id: string;
  deadline: string | null;
  deposited_at: string | null;
  file_name: string | null;
  file_path: string | null;
  status: string;
  is_locked: boolean;
  unlock_at: string | null;
  examen?: {
    id: string;
    session_type: string;
    exam_date: string;
    start_time: string;
    end_time: string;
    ue_id: string;
    ue_name?: string;
  };
}

export function useEnseignantSujets() {
  const { enseignant, allProfiles, loading: profileLoading, switchDepartment } = useEnseignantProfile();
  const [sujets, setSujets] = useState<ExamenSujet[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enseignant) return;
    setLoading(true);

    const { data: seancesData } = await supabase
      .from("seances")
      .select("ue_id")
      .eq("enseignant_id", enseignant.id);

    const ueIds = [...new Set((seancesData || []).map(s => s.ue_id))];
    if (ueIds.length === 0) { setSujets([]); setLoading(false); return; }

    const { data: examens } = await supabase
      .from("examens")
      .select("*")
      .in("ue_id", ueIds);

    if (!examens || examens.length === 0) { setSujets([]); setLoading(false); return; }

    const examenIds = examens.map(e => e.id);
    const { data: sujetsData } = await supabase
      .from("examen_sujets")
      .select("*")
      .in("examen_id", examenIds);

    const { data: uesData } = await supabase
      .from("unites_enseignement")
      .select("id, name")
      .in("id", ueIds);

    const ueMap = new Map((uesData || []).map(u => [u.id, u.name]));

    const result: ExamenSujet[] = examens.map(exam => {
      const sujet = (sujetsData || []).find(s => s.examen_id === exam.id);
      return {
        id: sujet?.id || "",
        examen_id: exam.id,
        deadline: sujet?.deadline || null,
        deposited_at: sujet?.deposited_at || null,
        file_name: sujet?.file_name || null,
        file_path: sujet?.file_path || null,
        status: sujet?.status || "en_attente",
        is_locked: sujet?.is_locked ?? true,
        unlock_at: sujet?.unlock_at || null,
        examen: {
          id: exam.id,
          session_type: exam.session_type,
          exam_date: exam.exam_date,
          start_time: exam.start_time,
          end_time: exam.end_time,
          ue_id: exam.ue_id,
          ue_name: ueMap.get(exam.ue_id) || "UE",
        },
      };
    });

    setSujets(result);
    setLoading(false);
  }, [enseignant]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (examenId: string, file: File) => {
    if (!enseignant) return;
    setUploading(examenId);

    const filePath = `${enseignant.department_id}/${examenId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("examen-sujets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur lors du téléversement");
      setUploading(null);
      return;
    }

    const existing = sujets.find(s => s.examen_id === examenId);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (existing?.id) {
      await supabase.from("examen_sujets").update({
        file_path: filePath,
        file_name: file.name,
        deposited_at: new Date().toISOString(),
        deposited_by: userId,
        status: "recu",
      }).eq("id", existing.id);
    } else {
      await supabase.from("examen_sujets").insert({
        examen_id: examenId,
        file_path: filePath,
        file_name: file.name,
        deposited_at: new Date().toISOString(),
        deposited_by: userId,
        status: "recu",
        is_locked: true,
      });
    }

    toast.success("Sujet déposé avec succès");
    setUploading(null);
    fetchData();
  };

  const toggleLock = async (sujet: ExamenSujet) => {
    if (!sujet.id) return;
    const newLocked = !sujet.is_locked;
    const { error } = await supabase.from("examen_sujets").update({
      is_locked: newLocked,
      unlock_at: newLocked ? null : null, // clear unlock_at when manually toggling
    }).eq("id", sujet.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(newLocked ? "Sujet verrouillé" : "Sujet déverrouillé");
    fetchData();
  };

  const setUnlockDate = async (sujetId: string, date: string | null) => {
    if (!sujetId) return;
    const { error } = await supabase.from("examen_sujets").update({
      unlock_at: date,
      is_locked: true, // keep locked until the date
    }).eq("id", sujetId);
    if (error) { toast.error("Erreur"); return; }
    toast.success(date ? "Date de déverrouillage définie" : "Date supprimée");
    fetchData();
  };

  /** Check if auto-unlock applies: 15min before exam start time */
  const isAutoUnlocked = (sujet: ExamenSujet): boolean => {
    if (!sujet.is_locked || !sujet.examen) return false;
    // Check unlock_at date
    if (sujet.unlock_at && new Date(sujet.unlock_at) <= new Date()) return true;
    // 15min before exam start
    const examDateTime = new Date(`${sujet.examen.exam_date}T${sujet.examen.start_time}`);
    examDateTime.setMinutes(examDateTime.getMinutes() - 15);
    return new Date() >= examDateTime;
  };

  return {
    enseignant, allProfiles, profileLoading, switchDepartment,
    sujets, loading, uploading,
    handleUpload, toggleLock, setUnlockDate, isAutoUnlocked, fetchData,
  };
}
