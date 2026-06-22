## The bug

`activateTeamMembership` in `src/lib/team.functions.ts` updates the new member's name fields and flips their `team_members` row to `active`, but it never sets `team_owner_id` or `role='member'` on their `profiles` row. Result: profile is orphaned from the team — exactly the symptom you reported.

The other parts of your spec (`/register?invite_token=...` URL, tier/coupon hiding, pre-filled email, invite subheading) already match how `/join-team` works today, because invites use Supabase's magic-link flow rather than a token-in-URL flow. So no UI work is needed.

## Change (single file)

**`src/lib/team.functions.ts` → `activateTeamMembership` handler**

After the existing `profiles` name update and before the `team_members` activation, add a step that:

1. Looks up the pending `team_members` row by the authenticated user's email, joined to `teams` to get `owner_id`.
2. Updates `profiles` for the current `user_id`, setting `team_owner_id = teams.owner_id` and `role = 'member'`.

Implementation notes:
- Match `team_members` by `email` + `status='pending'` (current convention; the URL doesn't carry a token).
- Use `supabaseAdmin` (per project rule for server functions).
- Wrap the new step in try/catch and `console.error` on failure — per your spec, do not block the user; they'll land in the app and can be corrected manually.
- Keep the existing `team_members` UPDATE (sets `status='active'`, `user_id`, `display_name`, `invite_accepted_at`) as-is; it already covers Step 3 of your SQL.
- Standard signup path (`/login?tab=signup`) is untouched.

## Out of scope (confirmed)

- No schema migration.
- No new `/register` route; `/join-team` stays.
- No changes to profile, assessment, report, or any other page.
- No changes to tier/coupon UI (already absent from `/join-team`).

## Verification

- Typecheck passes after the edit.
- Manually trace: new invitee accepts → `profiles.team_owner_id` = team owner's `user_id`, `profiles.role` = `'member'`, `team_members.user_id` populated, `team_members.status` = `'active'`.
