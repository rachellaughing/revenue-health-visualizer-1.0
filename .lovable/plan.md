## Resend Team Invite

### Goal
Let team owners resend a Supabase auth invitation email to any team member still in **Invited** status.

### Changes

#### 1. `src/lib/team.functions.ts` — new server function
Add `resendTeamInvite` (POST, protected by `requireSupabaseAuth`):
- Accept `{ id: string }` (the `team_members` row ID).
- Verify the caller owns the team by looking up the member row and checking its `team_id` matches the caller’s team.
- Call `supabaseAdmin.auth.admin.inviteUserByEmail(member.email, { redirectTo: <origin>/join-team })` to re-send the Supabase auth invite.
- On success, optionally refresh `invite_sent_at` on the `team_members` row.
- Return `{ ok: true, email }`.

#### 2. `src/components/settings/TeamTab.tsx` — UI button
- Wire up a `resendTeamInvite` mutation using `useServerFn`.
- For each member with `status === "Invited"`, render a small **"Resend"** text/link button next to the existing **"Remove"** button.
- Show a loading state while the mutation is pending.
- On success, show `toast.success("Invite resent to {email}")`.
- On error, show `toast.error(...)`.
- No page refresh or list refetch required — the Supabase email is the only side-effect.

### Notes / Edge Cases
- If the invited user already activated their account (status is no longer `pending`), the resend call should be rejected with a clear error.
- The `origin` for `redirectTo` can be passed from the client (`window.location.origin`) just like the initial invite flow.
- No database schema changes are needed.