# Auth UX + Branded Email Sender

## 1. Password visibility toggle
- Update `src/routes/login.tsx` and `src/routes/signup.tsx` Field components: when `type="password"`, render a right-aligned eye/eye-off button (lucide-react `Eye` / `EyeOff`) inside the input wrapper that toggles `type` between `password` and `text`.
- Styling matches existing field tokens (`--mm-off-white` bg, `--mm-mid` icon, `--mm-teal` on hover/focus). No layout shift; icon sits inside padding-right of the input.

## 2. Forgot password — inline modal on login
- In `src/routes/login.tsx`, add a "Forgot password?" link beneath the password field, right-aligned, `--mm-ember` color.
- Clicking opens an inline modal (shadcn `Dialog`) with a single email input + Send reset link button.
- Submit calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`. Show success state ("Check your inbox at …") and any error inline.
- Pre-fills the email field from the login form if already typed.

## 3. New `/reset-password` page
- New file `src/routes/reset-password.tsx` (public route, no auth gate).
- On mount: Supabase auto-creates a recovery session from the URL hash. Verify with `supabase.auth.getSession()`; if no recovery session, show "Link expired or invalid" with a link back to login.
- Form: new password + confirm password, both with the same eyeball toggle. On submit call `supabase.auth.updateUser({ password })`, then sign out and redirect to `/login` with a success toast.
- Brand-consistent layout matching `login.tsx` / `signup.tsx`.

## 4. Branded auth emails from no-reply@notify.revenuevisualizer.com
- Open the email domain setup dialog so you can verify `notify.revenuevisualizer.com` via DNS (NS delegation to Lovable).
- After setup, scaffold branded auth email templates (all 6: signup, magiclink, recovery, invite, email-change, reauthentication).
- Apply MM branding to the scaffolded React Email templates:
  - Body bg `#ffffff` (required), container in `--mm-paper` (#FFFEFA)
  - Headings in Instrument Serif, body in Inter (web-safe fallbacks for email clients)
  - Primary CTA buttons in `--mm-ember` (#F05223)
  - Footer with "Revenue Health Visualiser™" and Marketplace Maven copyright
- From address `no-reply@notify.revenuevisualizer.com` (sender domain is the delegated subdomain).
- Note: emails activate once DNS verification completes; templates can be scaffolded and styled before then.

## Technical notes
- No DB migration required — Supabase Auth handles password recovery natively.
- The eyeball toggle reuses the same `Field` component pattern by extending it to detect `type === "password"`.
- `/reset-password` must be a public route (top-level, not under `_authenticated/`) so recovery links work for signed-out users.
