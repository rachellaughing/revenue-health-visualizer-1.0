ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS overall_health_score numeric,
  ADD COLUMN IF NOT EXISTS overall_tracking_score numeric,
  ADD COLUMN IF NOT EXISTS calculated_at timestamptz;