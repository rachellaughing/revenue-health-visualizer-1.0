ALTER TABLE public.assessment_scores
  ADD COLUMN IF NOT EXISTS inconsistency_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_inconsistent boolean NOT NULL DEFAULT false;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS inconsistency_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inconsistency_pct numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.scoring_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.scoring_config TO authenticated;
GRANT ALL ON public.scoring_config TO service_role;

ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read scoring config" ON public.scoring_config;
CREATE POLICY "Authenticated users can read scoring config"
  ON public.scoring_config FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS set_updated_at ON public.scoring_config;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.scoring_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.scoring_config (key, value) VALUES
  ('inconsistency.child_system', '{"flag_at": 2, "severe_at": 3, "of": 4, "answer_value": 3}'::jsonb),
  ('inconsistency.assessment', '{"flag_at_pct": 25}'::jsonb)
ON CONFLICT (key) DO NOTHING;