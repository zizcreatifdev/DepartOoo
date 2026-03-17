-- ============================================================
-- 026_plans.sql
-- Table des plans tarifaires gérés par l'owner
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  slug            TEXT        UNIQUE NOT NULL,
  price_label     TEXT        NOT NULL DEFAULT 'Sur devis',
  period_label    TEXT,
  description     TEXT,
  features        JSONB       NOT NULL DEFAULT '[]',
  note            TEXT,
  cta_label       TEXT        NOT NULL DEFAULT 'Nous contacter',
  badge           TEXT,
  action          TEXT        NOT NULL DEFAULT 'contact',  -- 'login' | 'contact'
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  is_highlighted  BOOLEAN     NOT NULL DEFAULT false,
  display_order   INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Lecture publique (landing page sans auth)
CREATE POLICY "plans_select_all" ON public.plans
  FOR SELECT USING (true);

-- Écriture réservée à l'owner
CREATE POLICY "plans_insert_owner" ON public.plans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "plans_update_owner" ON public.plans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "plans_delete_owner" ON public.plans
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ── Données initiales ────────────────────────────────────────
INSERT INTO public.plans
  (name, slug, price_label, period_label, description, features, note, cta_label, badge, action, is_active, is_highlighted, display_order)
VALUES
(
  'Starter', 'starter',
  'Gratuit', '· 1 mois d''essai',
  'Accès complet pendant 30 jours, sans carte bancaire',
  '["1 assistant de département","30 enseignants maximum","Toutes les fonctionnalités incluses","Export PDF & Excel","Logo université sur les documents","Support par email"]'::jsonb,
  'Après 30 jours, les fonctionnalités se verrouillent jusqu''à souscription.',
  'Commencer gratuitement',
  NULL, 'login',
  true, false, 1
),
(
  'Pro', 'pro',
  'Sur devis', NULL,
  'Pour les départements qui veulent continuer après l''essai',
  '["2 assistants de département","60 enseignants maximum","Toutes les fonctionnalités illimitées","Notifications WhatsApp","Renouvellement annuel ou mensuel","Support prioritaire"]'::jsonb,
  NULL,
  'Je suis intéressé',
  'Populaire', 'contact',
  true, true, 2
),
(
  'Université', 'universite',
  'Sur devis', NULL,
  'Pour les établissements multi-départements',
  '["Assistants & enseignants illimités","Tous les départements de l''université","Dashboard centralisé","Accompagnement & formations","Intégration systèmes existants","Compte dédié"]'::jsonb,
  NULL,
  'Nous contacter',
  NULL, 'contact',
  true, false, 3
)
ON CONFLICT (slug) DO NOTHING;
