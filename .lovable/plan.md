## Fix: Owner tier lookup column mismatch in healthcheck.functions.ts

### Problem
`profiles.team_owner_id` stores the owner's `profiles.id` (primary key), but the owner tier fetch in `getHealthCheckData` uses `.eq("user_id", teamOwnerId)` — filtering by `profiles.user_id` (auth ID). Because these are different values, the query returns nothing and the tier override silently fails, leaving team members on the free tier.

### Solution
Replace the single incorrect column reference at line 209 of `src/lib/healthcheck.functions.ts`:

```typescript
// Before
.eq("user_id", teamOwnerId)

// After
.eq("id", teamOwnerId)
```

### Verification
- Search confirmed only one occurrence of `.eq("user_id", teamOwnerId)` exists in this file.
- No other functions in this file fetch owner profiles using `team_owner_id`.
- No schema changes required.
- Existing logging added in a previous turn will immediately confirm the fix works after deployment.