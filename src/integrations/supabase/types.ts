export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absence_settings: {
        Row: {
          created_at: string
          department_id: string
          id: string
          threshold_cm: number
          threshold_td: number
          threshold_tp: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          threshold_cm?: number
          threshold_td?: number
          threshold_tp?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          threshold_cm?: number
          threshold_td?: number
          threshold_tp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_settings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_filieres: {
        Row: {
          department_id: string
          id: string
          name: string
        }
        Insert: {
          department_id: string
          id?: string
          name: string
        }
        Update: {
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_filieres_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_levels: {
        Row: {
          department_id: string
          id: string
          level: Database["public"]["Enums"]["academic_level"]
        }
        Insert: {
          department_id: string
          id?: string
          level: Database["public"]["Enums"]["academic_level"]
        }
        Update: {
          department_id?: string
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
        }
        Relationships: [
          {
            foreignKeyName: "department_levels_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          onboarding_completed: boolean
          university: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          onboarding_completed?: boolean
          university: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          onboarding_completed?: boolean
          university?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          academic_year: string
          created_at: string
          department_id: string
          file_name: string
          file_path: string | null
          generated_by: string | null
          generated_by_name: string | null
          id: string
          metadata: Json | null
          related_enseignant_id: string | null
          related_level: string | null
          related_ue_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          department_id: string
          file_name: string
          file_path?: string | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          metadata?: Json | null
          related_enseignant_id?: string | null
          related_level?: string | null
          related_ue_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          department_id?: string
          file_name?: string
          file_path?: string | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          metadata?: Json | null
          related_enseignant_id?: string | null
          related_level?: string | null
          related_ue_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_enseignant_id_fkey"
            columns: ["related_enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_ue_id_fkey"
            columns: ["related_ue_id"]
            isOneToOne: false
            referencedRelation: "unites_enseignement"
            referencedColumns: ["id"]
          },
        ]
      }
      effectifs: {
        Row: {
          academic_year: string
          created_at: string
          department_id: string
          group_name: string
          id: string
          level: Database["public"]["Enums"]["academic_level"]
          student_count: number
        }
        Insert: {
          academic_year: string
          created_at?: string
          department_id: string
          group_name?: string
          id?: string
          level: Database["public"]["Enums"]["academic_level"]
          student_count?: number
        }
        Update: {
          academic_year?: string
          created_at?: string
          department_id?: string
          group_name?: string
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
          student_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "effectifs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignant_disponibilites: {
        Row: {
          created_at: string
          day_of_week: number
          enseignant_id: string
          id: string
          status: Database["public"]["Enums"]["availability_status"]
          time_slot: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          enseignant_id: string
          id?: string
          status?: Database["public"]["Enums"]["availability_status"]
          time_slot: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          enseignant_id?: string
          id?: string
          status?: Database["public"]["Enums"]["availability_status"]
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "enseignant_disponibilites_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants: {
        Row: {
          allocated_hours: number
          created_at: string
          department_id: string
          email: string
          first_name: string
          hourly_rate: number
          hours_done: number
          id: string
          is_active: boolean
          last_name: string
          quota_hours: number
          type: Database["public"]["Enums"]["teacher_type"]
          user_id: string | null
          vacation_end: string | null
          vacation_start: string | null
        }
        Insert: {
          allocated_hours?: number
          created_at?: string
          department_id: string
          email: string
          first_name: string
          hourly_rate?: number
          hours_done?: number
          id?: string
          is_active?: boolean
          last_name: string
          quota_hours?: number
          type: Database["public"]["Enums"]["teacher_type"]
          user_id?: string | null
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Update: {
          allocated_hours?: number
          created_at?: string
          department_id?: string
          email?: string
          first_name?: string
          hourly_rate?: number
          hours_done?: number
          id?: string
          is_active?: boolean
          last_name?: string
          quota_hours?: number
          type?: Database["public"]["Enums"]["teacher_type"]
          user_id?: string | null
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enseignants_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_resultats: {
        Row: {
          created_at: string
          examen_id: string
          id: string
          note: number | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          examen_id: string
          id?: string
          note?: number | null
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          examen_id?: string
          id?: string
          note?: number | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_resultats_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_resultats_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_salles: {
        Row: {
          created_at: string
          examen_id: string
          id: string
          salle_id: string
        }
        Insert: {
          created_at?: string
          examen_id: string
          id?: string
          salle_id: string
        }
        Update: {
          created_at?: string
          examen_id?: string
          id?: string
          salle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_salles_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_salles_salle_id_fkey"
            columns: ["salle_id"]
            isOneToOne: false
            referencedRelation: "salles"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_sujets: {
        Row: {
          created_at: string
          deadline: string | null
          deposited_at: string | null
          deposited_by: string | null
          examen_id: string
          file_name: string | null
          file_path: string | null
          id: string
          is_locked: boolean
          status: string
          unlock_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          deposited_at?: string | null
          deposited_by?: string | null
          examen_id: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_locked?: boolean
          status?: string
          unlock_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          deposited_at?: string | null
          deposited_by?: string | null
          examen_id?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_locked?: boolean
          status?: string
          unlock_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_sujets_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: true
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_surveillants: {
        Row: {
          created_at: string
          enseignant_id: string
          examen_id: string
          id: string
        }
        Insert: {
          created_at?: string
          enseignant_id: string
          examen_id: string
          id?: string
        }
        Update: {
          created_at?: string
          enseignant_id?: string
          examen_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_surveillants_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_surveillants_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      examens: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          department_id: string
          end_time: string
          exam_date: string
          id: string
          notes: string | null
          session_type: string
          start_time: string
          ue_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          department_id: string
          end_time: string
          exam_date: string
          id?: string
          notes?: string | null
          session_type?: string
          start_time: string
          ue_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          end_time?: string
          exam_date?: string
          id?: string
          notes?: string | null
          session_type?: string
          start_time?: string
          ue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "examens_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examens_ue_id_fkey"
            columns: ["ue_id"]
            isOneToOne: false
            referencedRelation: "unites_enseignement"
            referencedColumns: ["id"]
          },
        ]
      }
      maquette_history: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          maquette_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          maquette_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          maquette_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquette_history_maquette_id_fkey"
            columns: ["maquette_id"]
            isOneToOne: false
            referencedRelation: "maquettes"
            referencedColumns: ["id"]
          },
        ]
      }
      maquettes: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          department_id: string
          filiere_id: string
          id: string
          level: Database["public"]["Enums"]["academic_level"]
          semestre: Database["public"]["Enums"]["semestre"]
          status: Database["public"]["Enums"]["maquette_status"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          department_id: string
          filiere_id: string
          id?: string
          level: Database["public"]["Enums"]["academic_level"]
          semestre: Database["public"]["Enums"]["semestre"]
          status?: Database["public"]["Enums"]["maquette_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          filiere_id?: string
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
          semestre?: Database["public"]["Enums"]["semestre"]
          status?: Database["public"]["Enums"]["maquette_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquettes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquettes_filiere_id_fkey"
            columns: ["filiere_id"]
            isOneToOne: false
            referencedRelation: "department_filieres"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          note: number | null
          session_type: string
          student_id: string
          ue_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          note?: number | null
          session_type?: string
          student_id: string
          ue_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          note?: number | null
          session_type?: string
          student_id?: string
          ue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_ue_id_fkey"
            columns: ["ue_id"]
            isOneToOne: false
            referencedRelation: "unites_enseignement"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_config: {
        Row: {
          compensation_enabled: boolean
          compensation_threshold: number
          created_at: string
          department_id: string
          id: string
          passing_grade: number
          updated_at: string
        }
        Insert: {
          compensation_enabled?: boolean
          compensation_threshold?: number
          created_at?: string
          department_id: string
          id?: string
          passing_grade?: number
          updated_at?: string
        }
        Update: {
          compensation_enabled?: boolean
          compensation_threshold?: number
          created_at?: string
          department_id?: string
          id?: string
          passing_grade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_config_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      perturbations: {
        Row: {
          academic_year: string
          affected_groups: string[] | null
          affected_levels: string[] | null
          created_at: string
          created_by: string | null
          department_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          title: string
          type: Database["public"]["Enums"]["perturbation_type"]
          updated_at: string
        }
        Insert: {
          academic_year: string
          affected_groups?: string[] | null
          affected_levels?: string[] | null
          created_at?: string
          created_by?: string | null
          department_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          title: string
          type: Database["public"]["Enums"]["perturbation_type"]
          updated_at?: string
        }
        Update: {
          academic_year?: string
          affected_groups?: string[] | null
          affected_levels?: string[] | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          title?: string
          type?: Database["public"]["Enums"]["perturbation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perturbations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          seance_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          seance_id: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          seance_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_links_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
        ]
      }
      presences: {
        Row: {
          created_at: string
          id: string
          marked_by: string | null
          notes: string | null
          seance_id: string
          status: Database["public"]["Enums"]["presence_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          seance_id: string
          status?: Database["public"]["Enums"]["presence_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          seance_id?: string
          status?: Database["public"]["Enums"]["presence_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presences_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      responsables_classe: {
        Row: {
          created_at: string
          department_id: string
          email: string | null
          first_name: string
          group_name: string
          id: string
          last_name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          email?: string | null
          first_name: string
          group_name: string
          id?: string
          last_name: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          email?: string | null
          first_name?: string
          group_name?: string
          id?: string
          last_name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsables_classe_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      salle_creneaux: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          label: string | null
          salle_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          label?: string | null
          salle_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          label?: string | null
          salle_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "salle_creneaux_salle_id_fkey"
            columns: ["salle_id"]
            isOneToOne: false
            referencedRelation: "salles"
            referencedColumns: ["id"]
          },
        ]
      }
      salles: {
        Row: {
          capacity: number
          created_at: string
          department_id: string
          id: string
          name: string
          type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          capacity?: number
          created_at?: string
          department_id: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          capacity?: number
          created_at?: string
          department_id?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: [
          {
            foreignKeyName: "salles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      seances: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          end_time: string
          enseignant_id: string
          group_name: string
          id: string
          is_online: boolean
          notes: string | null
          online_link: string | null
          salle_id: string | null
          seance_date: string
          start_time: string
          type: string
          ue_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          end_time: string
          enseignant_id: string
          group_name?: string
          id?: string
          is_online?: boolean
          notes?: string | null
          online_link?: string | null
          salle_id?: string | null
          seance_date: string
          start_time: string
          type: string
          ue_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          end_time?: string
          enseignant_id?: string
          group_name?: string
          id?: string
          is_online?: boolean
          notes?: string | null
          online_link?: string | null
          salle_id?: string | null
          seance_date?: string
          start_time?: string
          type?: string
          ue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seances_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_salle_id_fkey"
            columns: ["salle_id"]
            isOneToOne: false
            referencedRelation: "salles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_ue_id_fkey"
            columns: ["ue_id"]
            isOneToOne: false
            referencedRelation: "unites_enseignement"
            referencedColumns: ["id"]
          },
        ]
      }
      semester_dates: {
        Row: {
          academic_year: string
          created_at: string
          department_id: string
          id: string
          semestre: string
          start_date: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          department_id: string
          id?: string
          semestre: string
          start_date: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          department_id?: string
          id?: string
          semestre?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "semester_dates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          department_id: string
          email: string | null
          first_name: string
          group_name: string
          id: string
          is_active: boolean
          last_name: string
          level: string
          student_number: string
        }
        Insert: {
          created_at?: string
          department_id: string
          email?: string | null
          first_name: string
          group_name?: string
          id?: string
          is_active?: boolean
          last_name: string
          level: string
          student_number: string
        }
        Update: {
          created_at?: string
          department_id?: string
          email?: string | null
          first_name?: string
          group_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          level?: string
          student_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      unites_enseignement: {
        Row: {
          coefficient: number
          created_at: string
          credits_ects: number
          id: string
          maquette_id: string
          name: string
          sort_order: number
          volume_cm: number
          volume_td: number
          volume_tp: number
        }
        Insert: {
          coefficient?: number
          created_at?: string
          credits_ects?: number
          id?: string
          maquette_id: string
          name: string
          sort_order?: number
          volume_cm?: number
          volume_td?: number
          volume_tp?: number
        }
        Update: {
          coefficient?: number
          created_at?: string
          credits_ects?: number
          id?: string
          maquette_id?: string
          name?: string
          sort_order?: number
          volume_cm?: number
          volume_td?: number
          volume_tp?: number
        }
        Relationships: [
          {
            foreignKeyName: "unites_enseignement_maquette_id_fkey"
            columns: ["maquette_id"]
            isOneToOne: false
            referencedRelation: "maquettes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      academic_level: "L1" | "L2" | "L3" | "M1" | "M2"
      app_role: "owner" | "chef" | "assistant" | "enseignant"
      availability_status: "disponible" | "indisponible"
      maquette_status: "brouillon" | "validee"
      perturbation_type:
        | "greve"
        | "jour_ferie"
        | "fermeture_administrative"
        | "intemperies"
      presence_status: "present" | "absent_justifie" | "absent_non_justifie"
      room_type: "amphi" | "salle_td" | "salle_tp" | "laboratoire"
      semestre: "S1" | "S2"
      teacher_type: "permanent" | "vacataire"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academic_level: ["L1", "L2", "L3", "M1", "M2"],
      app_role: ["owner", "chef", "assistant", "enseignant"],
      availability_status: ["disponible", "indisponible"],
      maquette_status: ["brouillon", "validee"],
      perturbation_type: [
        "greve",
        "jour_ferie",
        "fermeture_administrative",
        "intemperies",
      ],
      presence_status: ["present", "absent_justifie", "absent_non_justifie"],
      room_type: ["amphi", "salle_td", "salle_tp", "laboratoire"],
      semestre: ["S1", "S2"],
      teacher_type: ["permanent", "vacataire"],
    },
  },
} as const
