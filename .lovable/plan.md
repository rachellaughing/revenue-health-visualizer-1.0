# Stripe Pro Checkout — one-time payment

## Scope
- One product only: **Revenue Health Assessment™ (Pro)** using `STRIPE_PRICE_PRO_MONTHLY`.
- Diagnostic deposit checkout is **not** in this pass.
- Mode is `payment` (one-time), not `subscription`.
- On successful payment, set `profiles.tier = 'pro'`.

## What gets built

### 1. Server function: create checkout session
`src/lib/stripe-checkout.functions.ts` — `createServerFn` (auth-protected via `requireSupabaseAuth`):
- Reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY` from `process.env`.
- POSTs to `https://api.stripe.com/v1/checkout/sessions` with:
  - `mode=payment`
  - `line_items[0][price]=STRIPE_PRICE_PRO_MONTHLY`, `quantity=1`
  - `success_url={origin}/settings?tab=billing&success=true`
  - `cancel_url={origin}/settings?tab=billing`
  - `client_reference_id={userId}` (so the webhook knows which profile to upgrade)
  - `customer_email={user.email}` from `context.claims`
  - `metadata[user_id]={userId}`, `metadata[tier]=pro`
- Returns `{ url }` so the client can `window.location.href = url`.
- No Stripe SDK — `fetch` with `application/x-www-form-urlencoded`.

### 2. Webhook route: `/api/public/stripe-webhook`
`src/routes/api/public/stripe-webhook.ts` — server route, POST handler:
- Reads raw body via `request.text()`.
- Verifies `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` using Node `crypto` HMAC-SHA256 (Stripe's `t=...,v1=...` scheme, timing-safe compare).
- On `checkout.session.completed` where `payment_status === 'paid'`:
  - Extracts `user_id` from `client_reference_id` (fallback `metadata.user_id`).
  - Uses `supabaseAdmin` to `UPDATE public.profiles SET tier='pro', updated_at=now() WHERE user_id=$1`.
- Ignores other event types with 200.
- Returns 400 on bad signature, 200 on success (so Stripe doesn't retry).

### 3. Billing cards on `/settings`
`src/routes/settings.tsx` (or `settings.billing.tsx` if that's where the new UI lands — confirmed `/settings/billing` already exists as a stub) — render:
- **Current plan** card showing `profiles.tier` (fetched via a small `getCurrentTier` serverFn).
- **Upgrade to Pro** card: price, what's included, "Upgrade to Pro" button (ember CTA) that calls the checkout serverFn and redirects to `session.url`.
- If `tier === 'pro'` or `'diagnostic'`: show "You're on Pro" state instead of the upgrade CTA.
- Reads `?success=true` query param to show a toast/banner ("Welcome to Pro — your access is being activated").

Built in plain inline-styled JSX matching the existing brand tokens (`--mm-ember`, `--mm-paper`, Instrument Serif + Inter) so it's portable to the new `/settings` UI the user is prepping.

### 4. Cleanup
- Delete `StripeCheckCard` component + `checkStripeConnection` serverFn.
- Remove the import + render from `src/routes/diagnostic.tsx`.
- Delete `src/lib/stripe-check.functions.ts`.

## Stripe dashboard step (user action)
After deploy, user adds a webhook endpoint in Stripe pointing to:
`https://app.revenuevisualizer.com/api/public/stripe-webhook` (or preview URL for testing), subscribed to `checkout.session.completed`. The signing secret is already set as `STRIPE_WEBHOOK_SECRET`.

## Not in this plan
- Diagnostic deposit checkout
- Customer portal / cancel / refund flows
- Subscription billing of any kind
- Storing Stripe customer/session IDs in a new table (can add later if needed)
