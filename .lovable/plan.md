Add temporary debug logs exactly where requested, with no behavioral fixes or unrelated edits.

Steps:
1. In `src/lib/profile.functions.ts`, update only `getPersonalProfile`:
   - Log `[profile] handler reached, userId:` with `context.userId` at the start of the handler.
   - Log `[profile] data:` and `error:` immediately after the `profiles` query.
   - Keep the same query, error handling, and return behavior.

2. In `src/integrations/supabase/auth-middleware.ts`, update only `requireSupabaseAuth`:
   - Add the three requested logs before `supabase.auth.getUser(token)`:
     - `[auth] token present:`
     - `[auth] SUPABASE_URL:`
     - `[auth] ANON_KEY:`
   - Do not change authentication logic.

3. Verify the edit is limited to those two files and contains no functional fix.

4. After approval/build, use the preview/debug logs for `/profile/personal` and report back the observed console/server logs.