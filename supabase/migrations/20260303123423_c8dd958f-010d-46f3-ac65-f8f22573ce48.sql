
-- Table principale des examens
CREATE TABLE public.examens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  ue_id UUID NOT NULL REFERENCES public.unites_enseignement(id),
  session_type TEXT NOT NULL DEFAULT 'normale',
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  academic_year TEXT NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View examens" ON public.examens FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = examens.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert examens" ON public.examens FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = examens.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update examens" ON public.examens FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = examens.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete examens" ON public.examens FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = examens.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE TRIGGER update_examens_updated_at
BEFORE UPDATE ON public.examens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Salles affectées aux examens
CREATE TABLE public.examen_salles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  salle_id UUID NOT NULL REFERENCES public.salles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_salles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View examen_salles" ON public.examen_salles FOR SELECT
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_salles.examen_id AND p.id = auth.uid())
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert examen_salles" ON public.examen_salles FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_salles.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete examen_salles" ON public.examen_salles FOR DELETE
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_salles.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Surveillants d'examen
CREATE TABLE public.examen_surveillants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_surveillants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View examen_surveillants" ON public.examen_surveillants FOR SELECT
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_surveillants.examen_id AND p.id = auth.uid())
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert examen_surveillants" ON public.examen_surveillants FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_surveillants.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete examen_surveillants" ON public.examen_surveillants FOR DELETE
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_surveillants.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Gestion des sujets d'examen
CREATE TABLE public.examen_sujets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE UNIQUE,
  deadline DATE,
  deposited_at TIMESTAMPTZ,
  deposited_by UUID,
  file_path TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_sujets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View examen_sujets" ON public.examen_sujets FOR SELECT
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_sujets.examen_id AND p.id = auth.uid())
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert examen_sujets" ON public.examen_sujets FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_sujets.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role) OR has_role(auth.uid(), 'enseignant'::app_role))
);

CREATE POLICY "Update examen_sujets" ON public.examen_sujets FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_sujets.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role) OR has_role(auth.uid(), 'enseignant'::app_role))
);

CREATE TRIGGER update_examen_sujets_updated_at
BEFORE UPDATE ON public.examen_sujets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Résultats d'examen (pour éligibilité rattrapage)
CREATE TABLE public.examen_resultats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  note NUMERIC,
  status TEXT NOT NULL DEFAULT 'ajourne',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(examen_id, student_id)
);

ALTER TABLE public.examen_resultats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View examen_resultats" ON public.examen_resultats FOR SELECT
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_resultats.examen_id AND p.id = auth.uid())
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert examen_resultats" ON public.examen_resultats FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_resultats.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update examen_resultats" ON public.examen_resultats FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_resultats.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete examen_resultats" ON public.examen_resultats FOR DELETE
USING (
  EXISTS (SELECT 1 FROM examens e JOIN profiles p ON p.department_id = e.department_id WHERE e.id = examen_resultats.examen_id AND p.id = auth.uid())
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

-- Bucket de stockage pour les sujets d'examen
INSERT INTO storage.buckets (id, name, public) VALUES ('examen-sujets', 'examen-sujets', false);

CREATE POLICY "View exam subjects files" ON storage.objects FOR SELECT
USING (bucket_id = 'examen-sujets' AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Upload exam subjects files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'examen-sujets' AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid()
) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role) OR has_role(auth.uid(), 'enseignant'::app_role)));

CREATE POLICY "Delete exam subjects files" ON storage.objects FOR DELETE
USING (bucket_id = 'examen-sujets' AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid()
) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));
