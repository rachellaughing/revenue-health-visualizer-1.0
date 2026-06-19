alter table public.profiles
  add column if not exists job_function text,
  add column if not exists pain_point_categories jsonb,
  add column if not exists pain_point_ranking jsonb,
  add column if not exists pain_point_open_text text;

NOTIFY pgrst, 'reload schema';