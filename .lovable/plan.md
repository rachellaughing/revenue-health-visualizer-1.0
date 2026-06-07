# Stripe Payments — Final Plan

External Supabase rules out Lovable's built-in payments, so we use Stripe BYOK. All Stripe logic lives in TanStack server functions/routes.

## Tiers
- **Snapshot™ (`starter`)** — free, default on signup.
- **Assessment™ (`pro`)** — recurring subscription (monthly + annual).
- **Diagnostic™ (`diagnostic`)** — **sales-led "Contact us"** (no Stripe checkout). Tier is set manually by you via the existing `profiles.tier` column or admin portal.

## Database migration (one)
Add to `public.profiles`:
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_subscription_status text`
- `subscription_current_period_end timestamptz`
- Index on `stripe_customer_id`

(No `diagnostic_purchased_at` since Diagnostic is sales-led.)

## Secrets to add (you'll be prompted)
- `STRIPE_SECRET_KEY` — your `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` — your `whsec_...` (you have this)
- `STRIPE_PRICE_PRO_MONTHLY` — placeholder until you create the Stripe product
- `STRIPE_PRICE_PRO_ANNUAL` — placeholder until you create the Stripe product

You can paste `price_placeholder` for the two Price IDs now and update them in Project Settings later; checkout will error until they're real, but everything else builds.

## Server code
1. `src/lib/billing.functions.ts` (auth-protected via `requireSupabaseAuth`, uses `supabaseAdmin` per project rule):
   - `createCheckoutSession({ priceKey: 'pro_monthly' | 'pro_annual' })` → returns Stripe Checkout URL. Creates/reuses Stripe Customer keyed to `user.id`.
   - `createPortalSession()` → returns Stripe Billing Portal URL.
   - `getBillingStatus()` → tier, status, renewal date, portal availability.

2. `src/routes/api/public/stripe-webhook.ts` (raw body, signature-verified):
   - `checkout.session.completed` → set `tier='pro'`, store customer + subscription IDs.
   - `customer.subscription.updated` / `.deleted` → sync status + period end; downgrade to `starter` on cancel/unpaid.
   - `invoice.payment_failed` → mark `past_due` (no immediate downgrade).

Webhook URL (already configured in your Stripe dashboard):
`https://app.revenuevisualizer.com/api/public/stripe-webhook`

## Frontend
Replace placeholder `/settings/billing` page:
- Current tier + status + renewal date
- "Upgrade to Assessment™" with Monthly/Annual toggle → checkout
- **Diagnostic™ card**: "Talk to us" CTA (mailto or contact link — confirm below if you want a specific destination)
- "Manage subscription" → Stripe Billing Portal (existing subscribers)
- Success/cancel handling via `?status=success|cancel` query param + toast

## Install
- `bun add stripe`

## Order of operations
1. Migration (profiles columns).
2. Request 4 secrets.
3. Install `stripe` + build server functions, webhook route, billing page.
4. You create the 2 Stripe Products → update the 2 Price ID secrets → test in Stripe test mode.

## What's NOT included
- Coupon redemption (your `coupons` table is separate — wire later).
- Diagnostic checkout (sales-led per your choice).
- Tax / invoice customization (Stripe defaults).

One open question: for the Diagnostic "Contact us" CTA, do you want it to go to a `mailto:` (which email?), an external Calendly/form URL, or just an in-app contact route? Default if unspecified: `mailto:` to your account email.
