## Goal
Combine sign in and create account into a single tabbed right column on `/login`. Keep `/signup` as a deeplink that opens the same page with the Create account tab preselected (useful for marketing pages and ads).

## Changes

### 1. New shared component: `src/components/auth/AuthTabs.tsx`
- Renders the "Welcome" heading, subcopy, and the two-pill tab switcher (Sign in / Create account) styled like the uploaded reference (dark ember-ink pill for active, outlined for inactive).
- Props: `active: "signin" | "signup"`, `onChange(next)`.
- Used inside both routes so the form area swaps but the header stays put.

### 2. `src/routes/login.tsx`
- Add `validateSearch` to also accept optional `tab: "signin" | "signup"` (keep existing `verified`).
- Local state `tab` initialised from search param (defaults to `"signin"`).
- Render `<AuthTabs active={tab} onChange={setTab} />` above the form.
- When `tab === "signin"` → render existing sign in form + Forgot password + verified banner.
- When `tab === "signup"` → render the full signup form (lifted from `signup.tsx`): first/last name, email, password with eyeball + `PasswordRequirements`, business name, submit, plus the "Check your email" success state that replaces only the form area (tabs + header remain visible — answers the earlier success-state question implicitly by keeping the page coherent).
- Drop the bottom "No account? Create one" link (the tabs replace it).

### 3. `src/routes/signup.tsx`
- Reduce to a thin redirect route: `beforeLoad` → `redirect({ to: "/login", search: { tab: "signup" } })`. Preserves the public `/signup` URL for marketing/ads deeplinks.

### 4. Link updates
- `src/routes/login.tsx`: remove the old `<Link to="/signup">` footer (replaced by tabs).
- Leave other `/login` references (`__root.tsx`, `top-bar.tsx`, `team-member-shell.tsx`, `reset-password.tsx`, `join-team.tsx`, signup `emailRedirectTo`) unchanged — they still resolve correctly.

## Out of scope
- No changes to Supabase auth logic, validation, password rules, forgot-password dialog behaviour, or the left panel.
- No changes to other routes or styling tokens.
