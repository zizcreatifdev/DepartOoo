
-- Enum for room types
CREATE TYPE public.room_type AS ENUM ('amphi', 'salle_td', 'salle_tp', 'laboratoire');

-- Rooms table
CREATE TABLE public.salles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.room_type NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.salles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View salles" ON public.salles FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = salles.department_id))
    OR has_role(auth.uid(), 'owner'::app_role)
  );

CREATE POLICY "Insert salles" ON public.salles FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = salles.department_id))
    AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
  );

CREATE POLICY "Update salles" ON public.salles FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = salles.department_id))
    AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
  );

CREATE POLICY "Delete salles" ON public.salles FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department_id = salles.department_id))
    AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
  );

-- Room reservations / time slots
CREATE TABLE public.salle_creneaux (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salle_id UUID NOT NULL REFERENCES public.salles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(salle_id, day_of_week, start_time)
);

ALTER TABLE public.salle_creneaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View creneaux" ON public.salle_creneaux FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM salles s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = salle_creneaux.salle_id AND p.id = auth.uid()))
    OR has_role(auth.uid(), 'owner'::app_role)
  );

CREATE POLICY "Insert creneaux" ON public.salle_creneaux FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM salles s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = salle_creneaux.salle_id AND p.id = auth.uid()))
    AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
  );

CREATE POLICY "Update creneaux" ON public.salle_creneaux FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM salles s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = salle_creneaux.salle_id AND p.id = auth.uid()))
    AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
  );

CREATE POLICY "Delete creneaux" ON public.salle_creneaux FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM salles s JOIN profiles p ON p.department_id = s.department_id WHERE s.id = salle_creneaux.salle_id AND p.id = auth.uid()))
    AND (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'assistant'::app_role))
  );
