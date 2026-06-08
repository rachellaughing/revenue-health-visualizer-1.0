# Fix team-member invite → signup flow

## Problem

`inviteTeamMember` calls `supabase.auth.admin.inviteUserByEmail(email)` with no `redirectTo`. The invite email link sends the user to Supabase's default URL, where they land authenticated but with no password and no profile completion path. There's no route in this app to receive them, so the flow appears broken.

The regular `/signup` page won't work either — invitees already have an auth user; they need to *set* a password on the existing user, not create a new one.

## Solution

Add a dedicated `/join-team` page that:
1. Receives invitees after they click the email link (they arrive already authenticated via Supabase's recovery/invite token exchange).
2. Pre-fills their **email** (read-only, from `supabase.auth.getUser()`).
3. Pre-fills the **inviting company name** (read-only, looked up server-side from the team they were invited to).
4. Collects first name, last name, and password.
5. Calls `supabase.auth.updateUser({ password, data: { first_name, last_name } })`.
6. Flips their `team_members` row from `pending` → `active` and links `user_id`.
7. Routes them into normal onboarding (`/profile/company` or `/dashboard` if no further info needed).

## Changes

### 1. `src/lib/team.functions.ts`
- Update `inviteTeamMember` to pass `{ redirectTo: \`${origin}/join-team\` }` to `inviteUserByEmail`. Origin must come from the request (read `getRequestHeader('origin')` or a config) since this runs server-side.
- Add `getInviteContext` server fn — given the authenticated invitee, look up their `team_members` row by email, return `{ companyName, teamOwnerName, email, alreadyActivated }`. Company name = inviting owner's `company_profiles.company_name` (fallback to `profiles.business_name`).
- Add `activateTeamMembership` server fn — find pending `team_members` row matching `auth.email()`, set `status='active'`, `user_id=auth.uid()`, `joined_at=now()`.

### 2. `src/routes/join-team.tsx` (new)
- Public route (no `_authenticated` gate — invitee may still be mid-token-exchange).
- On mount: wait for `supabase.auth.getSession()`. If no session, show "Your invite link has expired — ask for a new one."
- Once authenticated, call `getInviteContext`. If no pending invite found, redirect to `/dashboard`.
- Render form: email (disabled), company name (disabled, contextual: "You've been invited to join {Company}"), first name, last name, password (with `PasswordRequirements`).
- On submit: `updateUser` → `activateTeamMembership` → navigate to `/profile/company` (so they finish onboarding) or `/health-check` per existing flow.

### 3. Tiny copy/UX
- In `settings.team.tsx` invite confirmation toast: mention "They'll get an email with a link to join your team."

## Out of scope
- Customizing the Supabase email template body (separate auth-email task).
- Changing existing `/signup` for regular users.
- Team owner notifications when a member activates.

## Notes
- Existing `handle_new_user` trigger already creates a `profiles` + `company_profiles` stub when the invited user is first created by `inviteUserByEmail`, so we only need to fill personal fields and activate membership — we do NOT create a second profile row.
- Per project knowledge: use `supabaseAdmin` for all DB writes in server functions.
