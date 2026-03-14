
-- Add unique constraint for notes upsert (import Excel)
CREATE UNIQUE INDEX IF NOT EXISTS notes_unique_student_ue_session_year 
ON public.notes (department_id, student_id, ue_id, session_type, academic_year);
