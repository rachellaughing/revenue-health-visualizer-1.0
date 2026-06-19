Apply the provided SQL as a Supabase migration to add four team-member profile fields to the existing `public.profiles` table.

Technical details
- Columns added: `job_function` (text), `pain_point_categories` (jsonb), `pain_point_ranking` (jsonb), `pain_point_open_text` (text).
- All new columns are nullable and use safe `IF NOT EXISTS` checks, so the migration can be rerun without error.
- `NOTIFY pgrst, 'reload schema'` is included to refresh the PostgREST schema cache after the change.
- No RLS or policy changes are needed; this is a structural addition to an existing table already governed by existing policies.
- The Supabase types file will be regenerated automatically after the migration runs.