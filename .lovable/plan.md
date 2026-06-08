## Goal
Replace three stub settings routes with one tabbed `/settings` page driven by `?tab=`, lift the existing billing UI into a tab, and add Account + Team tabs. Add a live password-requirements checklist to signup and the Account tab. Add the schema columns the team flow needs (no team-member shell experience this pass).

## Schema
Migration adding two columns (idempotent, no data changes):

```
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS parent_assessment_id uuid REFERENCES public.assessments(id);
```

Team ownership uses an **owner-based model**: `team_members.user_id` = the owner's user_id (existing column), invitee is identified by email. (No `teams` row required.) If `team_members` already has a different shape I'll reconcile in the same migration — I'll inspect with `read_query` before writing it.

## Routes
- New: `src/routes/settings.tsx` — the tabbed page. `validateSearch` for `tab: 'account' | 'billing' | 'team'` (default `account`) and `success?: boolean`.
- Convert existing leaf routes to thin redirects via `beforeLoad`:
  - `/settings/account` → `/settings?tab=account`
  - `/settings/billing` → `/settings?tab=billing`
  - `/settings/team`    → `/settings?tab=team`
- Sidebar: change the three Settings links to point at `/settings?tab=…` and use `search` props.

## Components (new, all under `src/components/settings/`)
- `SettingsTabs.tsx` — tab strip, switches via `navigate({ search: { tab } })`.
- `AccountTab.tsx` — composes the two sections.
- `PersonalDetailsCard.tsx` — `useQuery(getPersonalProfile)` + `useMutation(savePersonalProfile)` (already exist in `profile.functions.ts`). Email shown read-only with muted helper.
- `ChangePasswordCard.tsx` — three password inputs with eye toggles, live `<PasswordRequirements />`, disabled CTA until all 4 rules met and confirm matches, calls `supabase.auth.updateUser({ password })` client-side.
- `PasswordRequirements.tsx` — reusable; grey dot → green check. Each rule: ≥8 chars, uppercase A–Z, digit 0–9, special `!@#$%^&*`. Never shows red while typing; only after blur with unmet rules.
- `BillingTab.tsx` — refactor of the existing `settings.billing.tsx` body. Adds Diagnostic tier branch (current plan confirmed, no upsell) and the always-on muted "Book a discovery call" card linking to `/diagnostic`. Existing checkout mutation + success banner preserved.
- `TeamTab.tsx` — branches on tier:
  - Snapshot: renders the active layout inside a `filter: blur(3px)` wrapper with an absolute lock overlay + ember CTA that fires the same `createProCheckoutSession` mutation used in Billing.
  - Pro/Diagnostic: invite form + member list + amber info card (copy varies by tier).

## Signup
Replace inline password field with shared `<PasswordRequirements />` + same UX rules. CTA disabled until all rules met. No other signup changes.

## New server functions (`src/lib/team.functions.ts`)
All use `requireSupabaseAuth` + `supabaseAdmin` per project rule:
- `listTeamMembers()` — select `team_members` joined to `profiles` by invitee email or user_id, where `team_members.user_id = context.userId` (owner). Returns `{ id, email, display_name, initials, status }[]`.
- `inviteTeamMember({ email })` — validate email (Zod). Reject if a row already exists. Insert `team_members` with `status='invited'`, then `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: '<origin>/signup' })`. Return `{ ok: true }`. Tier-gate (pro/diagnostic) server-side.
- `removeTeamMember({ id })` — delete row scoped to owner.

(Brief mentions `team_members.status='invited'` and a `team` column — I'll inspect the actual columns with `read_query` and adapt field names. If the table already uses `team_id`, I'll create or reuse a `teams` row keyed by owner; that stays internal to these functions and the UI remains owner-based.)

## Tier source
Reuses `getCurrentTier` from `stripe-checkout.functions.ts`. Stripe code is not touched.

## Out of scope (explicitly)
- The team-member stripped-nav experience, `parent_assessment_id` wiring on Health Check submission, dashboard copy for invited team members. Schema column is added now; UI follows in a later plan.
- Stripe customer portal.
- Editing `stripe-checkout.functions.ts` or `stripe-webhook.ts`.

## Verification
- Build passes (typecheck) after route + sidebar changes.
- Manually: `/settings` opens Account tab; `?tab=billing` and `?tab=team` switch; old `/settings/account|billing|team` URLs redirect; password CTA stays disabled until all rules + match; signup CTA same.

## Footer
Copyright footer "© 2025 Marketplace Maven. All rights reserved." rendered inside `/settings` page bottom (not global, to keep scope tight).
