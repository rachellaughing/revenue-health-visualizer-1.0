## Stripe Secret Sanity Check

Add a tiny throwaway server function that pings Stripe with `STRIPE_SECRET_KEY` and verifies the two price IDs exist. Surface the result in a temporary diagnostic UI we can delete after.

### What gets built

1. **`src/lib/stripe-check.functions.ts`** — `createServerFn` (auth-protected via `requireSupabaseAuth`) that:
   - Reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL` from `process.env`
   - Calls `GET https://api.stripe.com/v1/account` to confirm the key is valid (returns account id, email, livemode flag)
   - Calls `GET https://api.stripe.com/v1/prices/{id}` for each price ID to confirm they exist and are active
   - Returns `{ account, monthly, annual, errors[] }` — no SDK, just `fetch`, so no new dependencies

2. **Temporary UI on `/diagnostic`** — add a "Stripe connection check" card with a button that calls the server fn via `useServerFn` + `useMutation`, then renders:
   - ✅ / ❌ for API key (with account email + `livemode: true/false` so you can see test vs live)
   - ✅ / ❌ for each price ID (with nickname, unit_amount, currency, interval)
   - Raw error message from Stripe if any call fails

### What's intentionally NOT in this plan
- No checkout session creation
- No webhook route
- No DB tables, no `subscriptions` table, no migrations
- No changes to `settings/billing` UI
- No new dependencies (uses `fetch`, not the `stripe` npm package)

### After you run it
You'll know within seconds whether: (a) the secret key is valid and which mode it's in, (b) both price IDs resolve, (c) prices are monthly/annual as expected. If any of that is wrong, we fix it before building. If all green, I tear out the diagnostic card and we move to the real checkout + webhook build.
