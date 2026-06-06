Update only `src/integrations/supabase/auth-middleware.ts`.

Changes:
- Replace the invalid `supabase.auth.getClaims(token)` call with `supabase.auth.getUser(token)`.
- Treat `error` or missing `data.user` as `Unauthorized: Invalid token`.
- Remove the `data.claims.sub` check entirely.
- Pass `data.user.id` as `userId` in middleware context.
- Pass `data.user` as `claims` to preserve the existing context field name.

No other files or behavior will be changed.