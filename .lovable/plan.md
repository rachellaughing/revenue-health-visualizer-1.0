## Bugs

Team members (`profiles.role = 'member'` with `team_owner_id` set) don't fill out their own `company_profiles` row — their company context comes from the team owner. But `profiles.company_profile_complete` stays `false` for them, so:

- The owner dashboard's "complete your company profile" gate fires (when a team member somehow lands there).
- The sidebar's `evalLock("profile", …)` locks Health Check (`!(profile_complete && company_profile_complete)`).

## Fix — single source of truth in `getDashboardData`

Make `getDashboardData` role-aware so every downstream gate gets a corrected value, with no widespread component changes.

### `src/lib/dashboard.functions.ts`

1. Extend the profile `.select(...)` to also fetch `role` and `team_owner_id`.
2. After fetching, compute:
   ```
   const isTeamMember = profile?.role === 'member' && profile?.team_owner_id != null;
   const effectiveCompanyComplete = isTeamMember ? true : profile.company_profile_complete;
   ```
3. Return `profile.company_profile_complete = effectiveCompanyComplete` in the response (override only on the returned object — don't write to the DB).

That single change fixes:

- `src/components/app-sidebar.tsx` `evalLock("profile", …)` → Health Check no longer locked for team members.
- `src/routes/dashboard.tsx` `isReturning` / NewUserView checklist `company_profile_complete` → no false "complete your company profile" warning. (Team members are already redirected to `TeamMemberDashboard` at the top of `DashboardPage`, but if any owner-side gate is reached transiently before viewer-context resolves, this keeps it consistent.)

### What is NOT changed

- `refresh_profile_completion` SQL function — leave as-is.
- Owner / independent-user logic — untouched (`isTeamMember` is false for them).
- `TeamMemberDashboard` and team-member profile save flow — already correct after the prior fix.
- No schema migration.

### Verification

- Sign in as a team member who has saved Your Perspective → sidebar shows Health Check unlocked, no profile-gate warning, `/health-check` accessible.
- Sign in as an owner with incomplete company profile → still gated as before.
