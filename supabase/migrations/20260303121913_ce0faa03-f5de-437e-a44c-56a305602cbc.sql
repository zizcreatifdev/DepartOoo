
-- Create perturbation type enum
CREATE TYPE public.perturbation_type AS ENUM ('greve', 'jour_ferie', 'fermeture_administrative', 'intemperies');

-- Create perturbations table
CREATE TABLE public.perturbations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  type public.perturbation_type NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  affected_levels TEXT[] DEFAULT '{}',
  affected_groups TEXT[] DEFAULT '{}',
  academic_year TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perturbations ENABLE ROW LEVEL SECURITY;

-- View policy: department members
CREATE POLICY "View perturbations"
ON public.perturbations FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = perturbations.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- Insert policy: chef or assistant
CREATE POLICY "Insert perturbations"
ON public.perturbations FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = perturbations.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Update policy: chef or assistant
CREATE POLICY "Update perturbations"
ON public.perturbations FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = perturbations.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Delete policy: chef or assistant
CREATE POLICY "Delete perturbations"
ON public.perturbations FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = perturbations.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Trigger for updated_at
CREATE TRIGGER update_perturbations_updated_at
BEFORE UPDATE ON public.perturbations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
