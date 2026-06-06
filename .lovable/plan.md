The file `src/integrations/supabase/auth-middleware.ts` reads server-side Supabase credentials using the wrong environment variable names. The runtime only exposes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, but the middleware currently looks for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, causing initialization failures and blank profile pages.

**Change:**

In `src/integrations/supabase/auth-middleware.ts`, replace:

```typescript
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
```

With:

```typescript
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
```

No other changes needed.