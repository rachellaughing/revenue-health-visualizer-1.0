I’ll add temporary server-side diagnostics inside `getHealthCheckData` only.

Plan:
1. Add a single structured `console.info` log after the team-owner tier override block, before the function uses `tier` for access/completion calculations.
2. Log exactly these fields:
   - `userId`
   - `role`
   - `team_owner_id`
   - fetched `ownerProfile.tier`
   - final returned/effective `tier`
3. Keep the existing tier override logic unchanged.
4. Do not touch `saveResponse`, `startNewAssessment`, `editCompletedResponse`, schemas, Stripe, or database code.
5. After implementation, publish/republish is still required for production logs to show on `app.revenuevisualizer.com`.