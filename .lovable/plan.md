## Goal
Let beta testers redeem a 100%-off coupon code on the Billing tab to upgrade from Snapshot → Assessment (`tier = 'pro'`) without going through Stripe. Seed `BETA100` as the first code.

## Schema
No structure changes. Use existing `public.coupons` table:
- `coupon_code`, `discount_type`, `discount_value`, `active`, `max_uses`, `use_count`, `valid_from`, `valid_until`.

Convention: `discount_type = 'percent'` with `discount_value = 100` means free upgrade (this is what the server checks for the Stripe-skip path). Other discount_type values (`percent` <100, `amount`) would route through Stripe — out of scope this pass.

Seed (via insert tool):
```
INSERT INTO public.coupons (coupon_code, discount_type, discount_value, active, max_uses)
VALUES ('BETA100', 'percent', 100, true, NULL);
```

Also record redemption on the user's profile via the existing `profiles.coupon_code_used` column (already in schema) and bump `coupons.use_count`.

## Server functions (new file `src/lib/coupon.functions.ts`)
Both use `requireSupabaseAuth` + `supabaseAdmin`.

1. `validateCoupon({ code })` — uppercases/trims input, looks up active coupon, checks `valid_from`/`valid_until`/`max_uses > use_count`. Returns `{ valid: true, discount_type, discount_value, free: boolean }` or `{ valid: false, reason }`. Used by the inline "Apply" button.

2. `redeemCoupon({ code })` — re-validates server-side, requires `free === true` (100% off) in this pass, then in a single transaction:
   - Update `profiles.tier = 'pro'` and `profiles.coupon_code_used = <code>` for `context.userId` (only if currently `starter`; reject if already `pro`/`diagnostic`).
   - `UPDATE coupons SET use_count = use_count + 1 WHERE coupon_code = <code>`.
   - Returns `{ ok: true, tier: 'pro' }`. UI then invalidates `current-tier` query.

Concurrency: rely on `max_uses IS NULL OR use_count < max_uses` guard inside the UPDATE's WHERE clause and check `rowCount === 1`; reject otherwise. No additional locking.

Reject all non-100% coupons in this pass with a clear `"This code requires checkout — open Stripe Checkout instead"` error (deferred to a future pass that wires Stripe promo codes).

## UI changes
### `src/components/settings/BillingTab.tsx` (Snapshot branch only)
Above the existing ember "Upgrade to Assessment™ — $197" CTA, add a small coupon row:
- Uppercase-as-you-type input (`placeholder="Have a beta code? Enter it here"`).
- "Apply" button → calls `validateCoupon`. On success show a green inline confirmation (`"BETA100 applied — free upgrade unlocked"`) and swap the primary CTA to **"Redeem code & upgrade — Free"** (still ember, same size). On invalid show muted red helper text.
- Redeem button → calls `redeemCoupon`, then `queryClient.invalidateQueries({ queryKey: ['current-tier'] })`; the existing tier card re-renders to Assessment automatically and the upsell block disappears.
- Original $197 checkout button remains visible until a valid free code is applied.

Diagnostic / Pro tiers: no coupon UI (nothing to upgrade).

### Stripe Checkout fallback
In `src/lib/stripe-checkout.functions.ts → createProCheckoutSession`, add `params.set("allow_promotion_codes", "true")` to the Checkout Session params so partial-discount Stripe promotion codes still work on the hosted page (future-proofs the "% off via Stripe" path without building UI for it yet).

## Data seed
Single `INSERT` via insert tool for `BETA100` (above). If row already exists, the tool call will error — that's fine, treat as already-seeded.

## Out of scope
- Partial-discount coupons through Stripe (deferred; Stripe `allow_promotion_codes` handles it server-side until we build dedicated UI).
- Coupon admin UI (codes managed directly in Supabase).
- Coupon usage on signup (`profiles.coupon_code_used` already populated from signup metadata by `handle_new_user` — untouched).
- Refunds / un-redeem.

## Verification
- BETA100 in Billing tab → Apply shows green confirmation → Redeem flips tier card to "Revenue Health Assessment™", upsell block disappears, `coupons.use_count` increments.
- Invalid / expired / exhausted code shows inline error, no state change.
- A second redeem attempt by the same already-Pro user is rejected server-side.
- Existing $197 Stripe checkout still works unchanged; Stripe Checkout page now shows the promo-code field.
