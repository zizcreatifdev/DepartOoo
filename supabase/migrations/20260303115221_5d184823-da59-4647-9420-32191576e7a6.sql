
-- Enum for teacher type
CREATE TYPE public.teacher_type AS ENUM ('permanent', 'vacataire');

-- Enseignants table
CREATE TABLE public.enseignants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  type teacher_type NOT NULL,
  -- permanent: quota d'heures statutaires
  quota_hours NUMERIC NOT NULL DEFAULT 0,
  -- vacataire: heures allouées, taux horaire, période
  allocated_hours NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  vacation_start DATE,
  vacation_end DATE,
  -- common
  hours_done NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enseignants ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "View enseignants"
ON public.enseignants FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = enseignants.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert enseignants"
ON public.enseignants FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = enseignants.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update enseignants"
ON public.enseignants FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = enseignants.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete enseignants"
ON public.enseignants FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = enseignants.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);
