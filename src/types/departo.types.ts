/**
 * departo.types.ts
 * Types TypeScript dérivés du schéma Supabase — usage dans les composants Departo
 */

import type { Database } from '@/integrations/supabase/types';

// ============================================================
// Helpers génériques
// ============================================================
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// ============================================================
// Enums
// ============================================================
export type AcademicLevel  = Database['public']['Enums']['academic_level'];   // L1|L2|L3|M1|M2
export type AppRole        = Database['public']['Enums']['app_role'];         // owner|chef|assistant|enseignant
export type MaquetteStatus = Database['public']['Enums']['maquette_status'];  // brouillon|validee
export type PerturbationType = Database['public']['Enums']['perturbation_type'];
export type PresenceStatus = Database['public']['Enums']['presence_status'];  // present|absent_justifie|absent_non_justifie
export type RoomType       = Database['public']['Enums']['room_type'];        // amphi|salle_td|salle_tp|laboratoire
export type Semestre       = Database['public']['Enums']['semestre'];         // S1|S2
export type TeacherType    = Database['public']['Enums']['teacher_type'];     // permanent|vacataire

// ============================================================
// Tables existantes — Row types
// ============================================================
export type Department         = Tables<'departments'>;
export type Profile            = Tables<'profiles'>;
export type UserRole           = Tables<'user_roles'>;
export type DepartmentFiliere  = Tables<'department_filieres'>;
export type DepartmentLevel    = Tables<'department_levels'>;
export type Maquette           = Tables<'maquettes'>;
export type MaquetteHistory    = Tables<'maquette_history'>;
export type UniteEnseignement  = Tables<'unites_enseignement'>;
export type Salle              = Tables<'salles'>;
export type SalleCreneau       = Tables<'salle_creneaux'>;
export type Enseignant         = Tables<'enseignants'>;
export type EnseignantDispo    = Tables<'enseignant_disponibilites'>;
export type Effectif           = Tables<'effectifs'>;
export type ResponsableClasse  = Tables<'responsables_classe'>;
export type Student            = Tables<'students'>;
export type Seance             = Tables<'seances'>;
export type PresenceLink       = Tables<'presence_links'>;
export type Presence           = Tables<'presences'>;
export type Perturbation       = Tables<'perturbations'>;
export type Examen             = Tables<'examens'>;
export type ExamenSalle        = Tables<'examen_salles'>;
export type ExamenSurveillant  = Tables<'examen_surveillants'>;
export type ExamenSujet        = Tables<'examen_sujets'>;
export type ExamenResultat     = Tables<'examen_resultats'>;
export type Note               = Tables<'notes'>;
export type NotesConfig        = Tables<'notes_config'>;
export type AbsenceSettings    = Tables<'absence_settings'>;
export type SemesterDate       = Tables<'semester_dates'>;
export type Document           = Tables<'documents'>;

// ============================================================
// Nouvelles tables (020_tables_manquantes)
// ============================================================

export interface StudentExclusion {
  id: string;
  student_id: string;
  ue_id: string;
  department_id: string;
  academic_year: string;
  nb_absences: number;
  excluded_at: string;
  excluded_by: string | null;
  created_at: string;
}

export type AlerteType =
  | 'absence_proche_seuil'
  | 'exclusion_automatique'
  | 'heures_rattraper'
  | 'sujet_retard'
  | 'licence_expiration';

export interface Alerte {
  id: string;
  department_id: string;
  type: AlerteType;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  lue: boolean;
  created_at: string;
}

export type PipelineStatut = 'discussion' | 'demo' | 'essai' | 'converti' | 'perdu';

export interface PipelineCommercial {
  id: string;
  department_id: string | null;
  statut: PipelineStatut;
  note: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  derniere_action: string | null;
  created_at: string;
}

export type StatutExclusion = 'actif' | 'abandonne' | 'exclu_absences';

// ============================================================
// Types composés (jointures fréquentes)
// ============================================================

/** Student enrichi avec filière et statut exclusion */
export interface StudentWithDetails extends Student {
  statut_exclusion: StatutExclusion;
  filiere?: DepartmentFiliere;
}

/** Séance avec enseignant et salle */
export interface SeanceWithDetails extends Seance {
  enseignant?: Enseignant;
  salle?: Salle;
  ue?: UniteEnseignement;
}

/** Note avec détails UE et étudiant */
export interface NoteWithDetails extends Note {
  student?: Pick<Student, 'id' | 'first_name' | 'last_name' | 'student_id'>;
  ue?: Pick<UniteEnseignement, 'id' | 'name' | 'code'>;
}

/** Examen avec salles et surveillants */
export interface ExamenWithDetails extends Examen {
  salles?: Salle[];
  surveillants?: Enseignant[];
  sujets?: ExamenSujet[];
}

/** Présence avec lien et statut */
export interface PresenceWithStudent extends Presence {
  student?: Pick<Student, 'id' | 'first_name' | 'last_name' | 'student_id'>;
}

// ============================================================
// Types utilitaires
// ============================================================

/** Réponse paginée générique */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

/** Statistiques d'absences par étudiant/UE */
export interface AbsenceStats {
  student_id: string;
  ue_id: string;
  nb_cm: number;
  nb_td: number;
  nb_tp: number;
  threshold_cm: number;
  threshold_td: number;
  threshold_tp: number;
  proche_seuil: boolean;
  exclu: boolean;
}

/** Résumé d'un département pour le dashboard */
export interface DepartmentSummary {
  department: Department;
  nb_students: number;
  nb_enseignants: number;
  nb_seances_semaine: number;
  nb_alertes_non_lues: number;
}
