# Stripe Payments — Mixed Tier Model

## Approach
Connect your own Stripe account (BYOK). Lovable Cloud isn't an option because your project uses an external Supabase. All Stripe logic lives in TanStack server functions/routes and writes to your existing `profiles` table.

## Tier model (placeholder pricing — you'll set real prices in Stripe later)
- **Snapshot™ (`starter`)** — free, default on signup. No Stripe object.
- **Assessment™ (`pro`)** — recurring subscription (monthly + annual prices in Stripe).
- **Diagnostic™ (`diagnostic`)** — one-time purchase (or sales-led "Contact us" — toggle).

## Database changes (one small migration)
Add Stripe linkage columns to `public.profiles`:
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_subscription_status text` (active, trialing, past_due, canceled, etc.)
- `subscription_current_period_end timestamptz`
- `diagnostic_purchased_at timestamptz`

Tier values stay `starter` / `pro` / `diagnostic` — no schema rename. RLS unchanged (existing self-read policy on profiles already covers these new columns).

## Server-side (TanStack)
1. `src/lib/billing.functions.ts`
   - `createCheckoutSession({ priceKey: 'pro_monthly' | 'pro_annual' | 'diagnostic_onetime' })` — auth-protected, creates/reuses Stripe Customer (tied to `user.id`), returns checkout URL.
   - `createPortalSession()` — auth-protected, returns Stripe Billing Portal URL for users to manage/cancel.
   - `getBillingStatus()` — returns current tier, subscription status, period end, portal availability.

2. `src/routes/api/public/stripe-webhook.ts` (server route, raw body, signature-verified with `STRIPE_WEBHOOK_SECRET`)
   - `checkout.session.completed` → upgrade tier (`pro` or `diagnostic`), store `stripe_customer_id`, `stripe_subscription_id`.
   - `customer.subscription.updated` / `.deleted` → sync status + period end; downgrade to `starter` on cancel/unpaid past grace.
   - `invoice.payment_failed` → mark `past_due` (no immediate downgrade).

Webhook uses `supabaseAdmin` (service role) since Stripe is unauthenticated.

## Frontend
1. **New `/settings/billing` page** (replaces the existing placeholder) — shows current tier, status, renewal date, and:
   - "Upgrade to Assessment™" → monthly/annual toggle → checkout
   - "Purchase Diagnostic™" → one-time checkout (or contact CTA)
   - "Manage subscription" → opens Stripe Billing Portal (existing subscribers only)
2. **Success/Cancel landing**: `/settings/billing?status=success|cancel` — toast + refetch billing.
3. **Upgrade CTAs** on existing locked pages (Shadow Systems, Roadmap blurred cards, etc.) link to `/settings/billing`.

## Secrets needed (you'll be prompted for these)
- `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys (use **test mode** key first).
- `STRIPE_WEBHOOK_SECRET` — generated after creating the webhook endpoint in Stripe Dashboard pointing at `https://<your-app>/api/public/stripe-webhook`.
- `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_DIAGNOSTIC` — Stripe Price IDs you'll create in the Stripe Dashboard once you decide on pricing. You can paste placeholders to start; checkout will simply error until real prices exist.

## What you'll do in Stripe
1. Create your Stripe account (or use existing).
2. Create 3 Products: Assessment Monthly, Assessment Annual, Diagnostic.
3. Copy the Price IDs into the secrets above.
4. Add a Webhook endpoint → URL `https://<your-app>/api/public/stripe-webhook`, copy signing secret.

## What this plan does NOT include
- Coupons/discount codes (your `coupons` table is separate — can wire later).
- Team seat billing for Diagnostic tier (per-seat add-ons) — defer until pricing is decided.
- Tax handling — Stripe Tax can be enabled later in the dashboard with one toggle; no code change.
- Invoice PDFs / customer email customization — Stripe handles by default.

## Order of operations
1. Migration (add columns to `profiles`).
2. Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` secrets (placeholders for Price IDs).
3. Build server functions + webhook + `/settings/billing` page.
4. You create products in Stripe → paste Price IDs → test checkout in Stripe test mode.
