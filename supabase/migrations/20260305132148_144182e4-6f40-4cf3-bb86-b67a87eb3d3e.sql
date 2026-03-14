ALTER TABLE public.examen_sujets 
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unlock_at timestamp with time zone DEFAULT NULL;