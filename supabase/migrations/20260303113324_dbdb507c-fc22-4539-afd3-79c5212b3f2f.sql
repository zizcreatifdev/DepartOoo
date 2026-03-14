
-- Create missing enums (maquette_status was created in the partial first migration, semestre was not)
DO $$ BEGIN
  CREATE TYPE public.semestre AS ENUM ('S1', 'S2');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maquette_status AS ENUM ('brouillon', 'validee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Now create all tables
CREATE TABLE public.maquettes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  filiere_id UUID NOT NULL REFERENCES public.department_filieres(id) ON DELETE CASCADE,
  level public.academic_level NOT NULL,
  semestre public.semestre NOT NULL,
  academic_year TEXT NOT NULL,
  status public.maquette_status NOT NULL DEFAULT 'brouillon',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, filiere_id, level, semestre, academic_year)
);

CREATE TABLE public.unites_enseignement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maquette_id UUID NOT NULL REFERENCES public.maquettes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  volume_cm NUMERIC(6,1) NOT NULL DEFAULT 0,
  volume_td NUMERIC(6,1) NOT NULL DEFAULT 0,
  volume_tp NUMERIC(6,1) NOT NULL DEFAULT 0,
  coefficient NUMERIC(4,2) NOT NULL DEFAULT 1,
  credits_ects NUMERIC(4,1) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.effectifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level public.academic_level NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Groupe unique',
  student_count INTEGER NOT NULL DEFAULT 0,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, level, group_name, academic_year)
);

CREATE TABLE public.maquette_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maquette_id UUID NOT NULL REFERENCES public.maquettes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maquettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unites_enseignement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effectifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquette_history ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_maquettes_updated_at BEFORE UPDATE ON public.maquettes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Maquettes RLS
CREATE POLICY "View maquettes" ON public.maquettes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = maquettes.department_id) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Insert maquettes" ON public.maquettes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = maquettes.department_id) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
CREATE POLICY "Update maquettes" ON public.maquettes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = maquettes.department_id) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
CREATE POLICY "Delete maquettes" ON public.maquettes FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = maquettes.department_id) AND public.has_role(auth.uid(), 'chef'));

-- UEs RLS
CREATE POLICY "View UEs" ON public.unites_enseignement FOR SELECT USING (EXISTS (SELECT 1 FROM public.maquettes m JOIN public.profiles p ON p.department_id = m.department_id WHERE m.id = unites_enseignement.maquette_id AND p.id = auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Insert UEs" ON public.unites_enseignement FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.maquettes m JOIN public.profiles p ON p.department_id = m.department_id WHERE m.id = unites_enseignement.maquette_id AND p.id = auth.uid()) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
CREATE POLICY "Update UEs" ON public.unites_enseignement FOR UPDATE USING (EXISTS (SELECT 1 FROM public.maquettes m JOIN public.profiles p ON p.department_id = m.department_id WHERE m.id = unites_enseignement.maquette_id AND p.id = auth.uid()) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
CREATE POLICY "Delete UEs" ON public.unites_enseignement FOR DELETE USING (EXISTS (SELECT 1 FROM public.maquettes m JOIN public.profiles p ON p.department_id = m.department_id WHERE m.id = unites_enseignement.maquette_id AND p.id = auth.uid()) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));

-- Effectifs RLS
CREATE POLICY "View effectifs" ON public.effectifs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = effectifs.department_id) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Insert effectifs" ON public.effectifs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = effectifs.department_id) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
CREATE POLICY "Update effectifs" ON public.effectifs FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = effectifs.department_id) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
CREATE POLICY "Delete effectifs" ON public.effectifs FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = effectifs.department_id) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));

-- History RLS
CREATE POLICY "View history" ON public.maquette_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.maquettes m JOIN public.profiles p ON p.department_id = m.department_id WHERE m.id = maquette_history.maquette_id AND p.id = auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Insert history" ON public.maquette_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.maquettes m JOIN public.profiles p ON p.department_id = m.department_id WHERE m.id = maquette_history.maquette_id AND p.id = auth.uid()) AND (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'assistant')));
