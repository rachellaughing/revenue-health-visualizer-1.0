CREATE TABLE revhealth2.recommended_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_system_id uuid NOT NULL UNIQUE REFERENCES revhealth2.child_systems(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  why text NOT NULL DEFAULT '',
  task_1 text NOT NULL DEFAULT '',
  task_2 text NOT NULL DEFAULT '',
  task_3 text NOT NULL DEFAULT '',
  task_4 text NOT NULL DEFAULT '',
  task_5 text NOT NULL DEFAULT '',
  outcome_1 text NOT NULL DEFAULT '',
  outcome_2 text NOT NULL DEFAULT '',
  outcome_3 text NOT NULL DEFAULT '',
  kpi_1 text NOT NULL DEFAULT '',
  kpi_2 text NOT NULL DEFAULT '',
  kpi_3 text NOT NULL DEFAULT '',
  warning_1 text NOT NULL DEFAULT '',
  warning_2 text NOT NULL DEFAULT '',
  warning_3 text NOT NULL DEFAULT '',
  warning_4 text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON revhealth2.recommended_actions TO authenticated;
GRANT ALL ON revhealth2.recommended_actions TO service_role;

ALTER TABLE revhealth2.recommended_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recommended actions"
  ON revhealth2.recommended_actions FOR SELECT TO authenticated USING (true);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON revhealth2.recommended_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.roadmap_task_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_system_id uuid NOT NULL,
  included boolean NOT NULL DEFAULT true,
  selected_task_indices integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roadmap_task_selections_unique UNIQUE (assessment_id, child_system_id),
  CONSTRAINT roadmap_task_selections_max_tasks
    CHECK (coalesce(array_length(selected_task_indices, 1), 0) <= 3)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_task_selections TO authenticated;
GRANT ALL ON public.roadmap_task_selections TO service_role;

ALTER TABLE public.roadmap_task_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own roadmap task selections"
  ON public.roadmap_task_selections FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.roadmap_task_selections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_roadmap_task_selections_assessment
  ON public.roadmap_task_selections (assessment_id, user_id);