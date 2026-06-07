Run a one-shot Node script in the sandbox that calls `supabase.auth.admin.updateUserById()` against the connected Supabase project to set the password for `e2e-jane-1780795923@marketplacemaven.com` to `TestPass123!`.

## Steps

1. Read `OWN_SUPABASE_URL` and `OWN_SUPABASE_SERVICE_ROLE_KEY` from the sandbox env.
2. Look up the user id by email (`admin.listUsers` + filter, or reuse the id already known from prior steps: `89addbe3-4a73-4fc9-97b2-c0c2a18dd5d9`).
3. Call `supabaseAdmin.auth.admin.updateUserById(userId, { password: 'TestPass123!' })`.
4. Print confirmation.

## Hand-off

Then I'll give you back:
- URL: preview `/login`
- Email: `e2e-jane-1780795923@marketplacemaven.com`
- Password: `TestPass123!`

The account already has profile + company profile complete, `tier='starter'`, and 15 child systems seeded across all 5 parents. You log in → Health Check → answer 60 questions → confirm % hits 100 and Report nav unlocks.

## No code changes

This is a one-off admin API call. No files modified, no migrations, no UI changes.