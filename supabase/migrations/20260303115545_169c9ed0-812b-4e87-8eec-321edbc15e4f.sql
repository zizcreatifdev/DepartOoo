
-- Disponibilités des enseignants
CREATE TYPE public.availability_status AS ENUM ('disponible', 'indisponible');

CREATE TABLE public.enseignant_disponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 1=Lundi .. 6=Samedi
  time_slot TEXT NOT NULL, -- 'matin', 'apres_midi', 'soir'
  status availability_status NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enseignant_id, day_of_week, time_slot)
);

ALTER TABLE public.enseignant_disponibilites ENABLE ROW LEVEL SECURITY;

-- Enseignant can view/manage their own disponibilités
CREATE POLICY "View own disponibilites"
ON public.enseignant_disponibilites FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM enseignants e
    JOIN profiles p ON p.department_id = e.department_id
    WHERE e.id = enseignant_disponibilites.enseignant_id AND p.id = auth.uid()
  ))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert disponibilites"
ON public.enseignant_disponibilites FOR INSERT
WITH CHECK (
  -- enseignant manages own, or chef/assistant manages department
  (EXISTS (
    SELECT 1 FROM enseignants e
    WHERE e.id = enseignant_disponibilites.enseignant_id
    AND (
      e.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.department_id = e.department_id
        AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
      )
    )
  ))
);

CREATE POLICY "Update disponibilites"
ON public.enseignant_disponibilites FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM enseignants e
    WHERE e.id = enseignant_disponibilites.enseignant_id
    AND (
      e.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.department_id = e.department_id
        AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
      )
    )
  ))
);

CREATE POLICY "Delete disponibilites"
ON public.enseignant_disponibilites FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM enseignants e
    WHERE e.id = enseignant_disponibilites.enseignant_id
    AND (
      e.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.department_id = e.department_id
        AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
      )
    )
  ))
);

-- Semester dates config for reminders
CREATE TABLE public.semester_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  semestre TEXT NOT NULL, -- 'S1' or 'S2'
  start_date DATE NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, semestre, academic_year)
);

ALTER TABLE public.semester_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View semester_dates"
ON public.semester_dates FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = semester_dates.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Manage semester_dates"
ON public.semester_dates FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = semester_dates.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update semester_dates"
ON public.semester_dates FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = semester_dates.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete semester_dates"
ON public.semester_dates FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = semester_dates.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);
