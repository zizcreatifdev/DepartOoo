
-- Table centralisée des documents générés
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'actif',
  generated_by UUID,
  generated_by_name TEXT,
  related_enseignant_id UUID REFERENCES public.enseignants(id),
  related_ue_id UUID REFERENCES public.unites_enseignement(id),
  related_level TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View documents" ON public.documents FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = documents.department_id))
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Insert documents" ON public.documents FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = documents.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Update documents" ON public.documents FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = documents.department_id))
  AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
);

CREATE POLICY "Delete documents" ON public.documents FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.department_id = documents.department_id))
  AND has_role(auth.uid(), 'chef'::app_role)
);

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket de stockage pour les documents générés
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "View documents files" ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Upload documents files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid()
) AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role)));

CREATE POLICY "Delete documents files" ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid()
) AND has_role(auth.uid(), 'chef'::app_role));
