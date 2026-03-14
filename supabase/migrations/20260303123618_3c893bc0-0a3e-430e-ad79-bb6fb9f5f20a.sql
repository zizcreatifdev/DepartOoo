
-- Notes par étudiant par UE
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  ue_id UUID NOT NULL REFERENCES public.unites_enseignement(id),
  note NUMERIC,
  academic_year TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'normale',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, ue_id, session_type, academic_year)
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View notes" ON public.notes FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert notes" ON public.notes FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update notes" ON public.notes FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete notes" ON public.notes FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configuration des règles de compensation par département
CREATE TABLE public.notes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) UNIQUE,
  passing_grade NUMERIC NOT NULL DEFAULT 10,
  compensation_enabled BOOLEAN NOT NULL DEFAULT true,
  compensation_threshold NUMERIC NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View notes_config" ON public.notes_config FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes_config.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert notes_config" ON public.notes_config FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes_config.department_id))
  AND has_role(auth.uid(), 'chef'::app_role)
);

CREATE POLICY "Update notes_config" ON public.notes_config FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = notes_config.department_id))
  AND has_role(auth.uid(), 'chef'::app_role)
);

CREATE TRIGGER update_notes_config_updated_at
BEFORE UPDATE ON public.notes_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
