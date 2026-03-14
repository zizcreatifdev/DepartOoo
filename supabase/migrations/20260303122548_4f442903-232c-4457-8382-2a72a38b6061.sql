
-- Create absence status enum
CREATE TYPE public.presence_status AS ENUM ('present', 'absent_justifie', 'absent_non_justifie');

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  student_number TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Groupe unique',
  level TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, student_number)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View students" ON public.students FOR SELECT
USING ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = students.department_id)) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Insert students" ON public.students FOR INSERT
WITH CHECK ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = students.department_id)) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

CREATE POLICY "Update students" ON public.students FOR UPDATE
USING ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = students.department_id)) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

CREATE POLICY "Delete students" ON public.students FOR DELETE
USING ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = students.department_id)) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

-- Presences table
CREATE TABLE public.presences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seance_id UUID NOT NULL REFERENCES public.seances(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.presence_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seance_id, student_id)
);

ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View presences" ON public.presences FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presences.seance_id AND p.id = auth.uid()))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert presences" ON public.presences FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presences.seance_id AND p.id = auth.uid()))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role) OR has_role(auth.uid(), 'enseignant'::app_role))
);

CREATE POLICY "Update presences" ON public.presences FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presences.seance_id AND p.id = auth.uid()))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role) OR has_role(auth.uid(), 'enseignant'::app_role))
);

CREATE POLICY "Delete presences" ON public.presences FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presences.seance_id AND p.id = auth.uid()))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Absence settings table (per department)
CREATE TABLE public.absence_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) UNIQUE,
  threshold_cm INTEGER NOT NULL DEFAULT 3,
  threshold_td INTEGER NOT NULL DEFAULT 3,
  threshold_tp INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.absence_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View absence_settings" ON public.absence_settings FOR SELECT
USING ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = absence_settings.department_id)) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Insert absence_settings" ON public.absence_settings FOR INSERT
WITH CHECK ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = absence_settings.department_id)) AND has_role(auth.uid(), 'chef'::app_role));

CREATE POLICY "Update absence_settings" ON public.absence_settings FOR UPDATE
USING ((EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = absence_settings.department_id)) AND has_role(auth.uid(), 'chef'::app_role));

-- Shareable presence links
CREATE TABLE public.presence_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seance_id UUID NOT NULL REFERENCES public.seances(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.presence_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View presence_links" ON public.presence_links FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presence_links.seance_id AND p.id = auth.uid()))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert presence_links" ON public.presence_links FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presence_links.seance_id AND p.id = auth.uid()))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update presence_links" ON public.presence_links FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM seances s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = presence_links.seance_id AND p.id = auth.uid()))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Trigger for updated_at on presences
CREATE TRIGGER update_presences_updated_at BEFORE UPDATE ON public.presences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_absence_settings_updated_at BEFORE UPDATE ON public.absence_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
