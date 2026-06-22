# Fix Health Check tier for team members

## Root cause

`src/lib/healthcheck.functions.ts` fetches `profile.tier` directly and never inherits the team owner's tier. Two bugs compound:

1. `getHealthCheckData` (line 197) checks `role === "team_member"`, but the actual stored value is `"member"` (set by `team.functions.ts:258`). So `isTeamMember` is always false here — the team-member branches never fire.
2. Even when detected, the function uses the member's own `tier` (which is `starter`) instead of the owner's tier. That's why the UI shows "Revenue Health Snapshot™ · 15 subsystems · Upgrade for full access".

The Health Check page reads `data.tier` from this server fn, so the dashboard fix in `getDashboardData` never reaches it.

## Fix

Apply the same inheritance pattern already used in `src/lib/dashboard.functions.ts` to `src/lib/healthcheck.functions.ts`:

1. **`getHealthCheckData` (~line 186-197):**
   - Add `team_owner_id` to the profile select.
   - Detect team member as `role === "member" && team_owner_id != null` (matches dashboard logic and the actual DB value). Keep the existing `"team_member"` check as a fallback alias so nothing else breaks.
   - If team member, fetch the owner's tier (`supabaseAdmin.from("profiles").select("tier").eq("user_id", team_owner_id).maybeSingle()`) and use that as the effective `tier` returned to the client.

2. **Save-response handler (~line 418-423):** same override — when the assessment's user is a team member, use the owner's tier for completion math so the percentage isn't computed against starter limits.

3. **`startNewAssessment` (~line 722-729):** same override so `assessment_type` / `tier_at_start` reflect the inherited tier, not `starter`.

No change to the route component — it already consumes `data.tier`. With the corrected value, the "Upgrade for full access" banner naturally hides for team members of a pro/diagnostic owner.

## Out of scope

- `getDashboardData` tier override — unchanged.
- Free tier for genuine starter users (no `team_owner_id`) — unchanged.
- No schema changes, no UI changes, no changes to the role enum.
