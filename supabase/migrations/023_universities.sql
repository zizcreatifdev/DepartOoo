-- ============================================================
-- Migration 023 : Table universities + university_id dans departments
--                 + bucket university-logos + 7 universités sénégalaises
-- ============================================================

-- ── 1. Table universities ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.universities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  short_name  TEXT,                         -- ex : 'UGB', 'UCAD'
  country     TEXT        DEFAULT 'Sénégal',
  city        TEXT,
  logo_url    TEXT,                         -- URL publique dans Storage
  logo_path   TEXT,                         -- chemin dans le bucket
  website     TEXT,
  statut      TEXT        DEFAULT 'a_verifier'
                CHECK (statut IN ('officielle', 'a_verifier')),
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index plein texte (recherche par nom)
CREATE INDEX IF NOT EXISTS idx_universities_name
  ON public.universities USING gin(to_tsvector('french', name));

-- Index exact sur l'abréviation
CREATE INDEX IF NOT EXISTS idx_universities_short
  ON public.universities(short_name);

-- Trigger updated_at (réutilise la fonction existante dans le projet)
CREATE TRIGGER set_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. RLS ────────────────────────────────────────────────

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (recherche dans l'onboarding, sans auth)
CREATE POLICY "universities_select_all"
  ON public.universities FOR SELECT
  USING (true);

-- Tout utilisateur authentifié peut créer une université
CREATE POLICY "universities_insert_auth"
  ON public.universities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seul l'owner peut modifier (valider, remplacer le logo, etc.)
CREATE POLICY "universities_update_owner"
  ON public.universities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── 3. Colonne university_id dans departments ─────────────

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS university_id UUID
    REFERENCES public.universities(id) ON DELETE SET NULL;

-- Conserver la colonne texte 'university' le temps de la migration
-- (elle sera supprimée dans une migration future)

-- ── 4. Bucket Storage university-logos ───────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('university-logos', 'university-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (URLs dans les PDFs, sans auth)
CREATE POLICY "logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'university-logos');

-- Upload pour tout utilisateur authentifié
CREATE POLICY "logos_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'university-logos'
    AND auth.uid() IS NOT NULL
  );

-- Remplacement/mise à jour par l'owner uniquement
CREATE POLICY "logos_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'university-logos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── 5. Les 7 universités publiques sénégalaises ───────────

INSERT INTO public.universities (name, short_name, city, statut) VALUES
  ('Université Gaston Berger',                              'UGB',    'Saint-Louis', 'officielle'),
  ('Université Cheikh Anta Diop',                           'UCAD',   'Dakar',       'officielle'),
  ('Université Assane Seck',                                'UASZ',   'Ziguinchor',  'officielle'),
  ('Université Alioune Diop',                               'UADB',   'Bambey',      'officielle'),
  ('Université Numérique Cheikh Hamidou Kane',              'UNCHK',  'Dakar',       'officielle'),
  ('Université Iba Der Thiam',                              'UIDT',   'Thiès',       'officielle'),
  ('Université du Sine Saloum El-Hâdj Ibrahima Niass',     'USSEIN', 'Kaolack',     'officielle')
ON CONFLICT DO NOTHING;
