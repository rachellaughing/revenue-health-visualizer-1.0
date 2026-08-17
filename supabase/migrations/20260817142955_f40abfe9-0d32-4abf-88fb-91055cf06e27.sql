CREATE TABLE public.opportunity_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_system_id uuid NOT NULL,
  what_we_see text NOT NULL,
  why_it_matters text NOT NULL,
  start_here jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, child_system_id)
);

GRANT SELECT ON public.opportunity_actions TO authenticated;
GRANT ALL ON public.opportunity_actions TO service_role;

ALTER TABLE public.opportunity_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own opportunity actions"
ON public.opportunity_actions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.opportunity_actions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();