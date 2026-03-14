
-- Table des responsables de classe
CREATE TABLE public.responsables_classe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, group_name)
);

ALTER TABLE public.responsables_classe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View responsables" ON public.responsables_classe FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = responsables_classe.department_id) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Insert responsables" ON public.responsables_classe FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = responsables_classe.department_id) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

CREATE POLICY "Update responsables" ON public.responsables_classe FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = responsables_classe.department_id) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

CREATE POLICY "Delete responsables" ON public.responsables_classe FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = responsables_classe.department_id) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

CREATE TRIGGER update_responsables_classe_updated_at
BEFORE UPDATE ON public.responsables_classe
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
