## Plan

In `src/routes/profile.company.tsx`, inside the `TeamMemberCompanyView` component, update the `onSave` function so that after a successful `saveMine` call it redirects to `/dashboard` — exactly as the `OwnerCompanyForm` does after `saveCo`.

### Change
- After `setSaved(true);` in the `try` block of `onSave`, add:
  `navigate({ to: "/dashboard" });`

No other code changes. The `navigate` hook is already imported in `TeamMemberCompanyView`.