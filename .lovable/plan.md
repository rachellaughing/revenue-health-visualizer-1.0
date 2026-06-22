## Problem
Team members currently inherit their own free/starter `tier` instead of their team owner's paid tier, which gates access to the full Health Check.

## Fix — `src/lib/dashboard.functions.ts`
After the existing `isTeamMember` check in `getDashboardData`, add a fetch of the team owner's `tier` and override it on the returned profile object (no DB write).

```
if (isTeamMember) {
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', profile.team_owner_id)
    .single();

  if (ownerProfile?.tier) {
    profile.tier = ownerProfile.tier;
  }
}
```

## What does NOT change
- Owner / independent-user tier logic — untouched.
- No DB writes.
- No Stripe changes.
- No schema migration.
