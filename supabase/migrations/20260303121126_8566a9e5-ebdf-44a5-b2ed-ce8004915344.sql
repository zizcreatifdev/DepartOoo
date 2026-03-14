
-- Table des séances planifiées (cours dans l'emploi du temps)
CREATE TABLE public.seances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  ue_id UUID NOT NULL REFERENCES public.unites_enseignement(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  salle_id UUID REFERENCES public.salles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('CM', 'TD', 'TP')),
  group_name TEXT NOT NULL DEFAULT 'Groupe unique',
  seance_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  online_link TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_seances_department_date ON public.seances(department_id, seance_date);
CREATE INDEX idx_seances_enseignant ON public.seances(enseignant_id, seance_date);
CREATE INDEX idx_seances_salle ON public.seances(salle_id, seance_date);
CREATE INDEX idx_seances_ue ON public.seances(ue_id);

-- Enable RLS
ALTER TABLE public.seances ENABLE ROW LEVEL SECURITY;

-- View: members of the same department
CREATE POLICY "View seances"
ON public.seances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.department_id = seances.department_id
  )
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- Insert: chef or assistant of the department
CREATE POLICY "Insert seances"
ON public.seances FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.department_id = seances.department_id
  )
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Update: chef or assistant
CREATE POLICY "Update seances"
ON public.seances FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.department_id = seances.department_id
  )
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Delete: chef or assistant
CREATE POLICY "Delete seances"
ON public.seances FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.department_id = seances.department_id
  )
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Trigger for updated_at
CREATE TRIGGER update_seances_updated_at
BEFORE UPDATE ON public.seances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
