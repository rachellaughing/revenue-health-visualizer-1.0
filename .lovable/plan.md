# Email-verification UX on signup

Two small changes, both in `src/routes/signup.tsx`. No DB, no auth-template scaffolding needed.

## 1. Show a "check your email" confirmation after signup

Currently the signup handler calls `supabase.auth.signUp(...)` then immediately `navigate({ to: "/profile/personal" })`. Because Supabase requires email confirmation, the user lands on a logged-out profile page and is confused.

Change: on successful `signUp`, do **not** navigate. Instead, swap the form for a confirmation card in the same page:

> **Check your email**
> We've sent a verification link to **{email}**. Click the link to activate your account, then sign in to continue.
> [Resend email] (calls `supabase.auth.resend({ type: 'signup', email })`)
> [Back to sign in] → `/login`

Implemented via a local `submitted` state flag — no new routes, no new files.

## 2. Redirect the verification link to `/login` with a success banner

Change `emailRedirectTo` from `${window.location.origin}/dashboard` to `${window.location.origin}/login?verified=1`.

In `src/routes/login.tsx`:
- Add `validateSearch` to accept an optional `verified` flag.
- When `verified=1` is present, render a green confirmation strip above the form: *"Email verified — sign in to continue."*

This avoids the Supabase-hosted error page entirely. Supabase exchanges the token, sets the session, then bounces the user to `/login?verified=1`. If their session is already active, the login form's existing "already signed in" path (if any) handles it; otherwise they sign in once and proceed.

## Out of scope
- Custom-branded auth email templates (would require `scaffold_auth_email_templates` + a verified email domain). Default Supabase email is fine for now; we're just fixing the redirect target and post-signup UX.
- Changing the Supabase Auth "Site URL" or redirect allow-list — `${window.location.origin}/login` is already same-origin, so it's covered by the existing Site URL.
