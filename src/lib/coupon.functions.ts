import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/i, "Invalid characters"),
});

type CouponRow = {
  coupon_code: string;
  discount_type: string;
  discount_value: number | null;
  active: boolean;
  max_uses: number | null;
  use_count: number;
  valid_from: string | null;
  valid_until: string | null;
};

async function loadCoupon(code: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select(
      "coupon_code, discount_type, discount_value, active, max_uses, use_count, valid_from, valid_until",
    )
    .eq("coupon_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CouponRow | null;
}

function checkUsability(c: CouponRow):
  | { ok: true; free: boolean }
  | { ok: false; reason: string } {
  if (!c.active) return { ok: false, reason: "This code is no longer active." };
  const now = Date.now();
  if (c.valid_from && new Date(c.valid_from).getTime() > now)
    return { ok: false, reason: "This code isn't active yet." };
  if (c.valid_until && new Date(c.valid_until).getTime() < now)
    return { ok: false, reason: "This code has expired." };
  if (c.max_uses != null && c.use_count >= c.max_uses)
    return { ok: false, reason: "This code has reached its usage limit." };
  const free =
    c.discount_type === "free" ||
    (c.discount_type === "pct" && (c.discount_value ?? 0) >= 100);
  return { ok: true, free };
}

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => CodeSchema.parse(d))
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase();
    const c = await loadCoupon(code);
    if (!c) return { valid: false as const, reason: "Code not found." };
    const u = checkUsability(c);
    if (!u.ok) return { valid: false as const, reason: u.reason };
    return {
      valid: true as const,
      code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      free: u.free,
    };
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => CodeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const code = data.code.toUpperCase();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const c = await loadCoupon(code);
    if (!c) throw new Error("Code not found.");
    const u = checkUsability(c);
    if (!u.ok) throw new Error(u.reason);
    if (!u.free)
      throw new Error(
        "This code requires checkout — use Stripe Checkout instead.",
      );

    // Re-check tier
    const { data: prof, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const currentTier = (prof?.tier as string | null) ?? "starter";
    if (currentTier !== "starter")
      throw new Error("You're already on a paid plan.");

    // Bump use_count with guard
    const guard =
      c.max_uses == null
        ? supabaseAdmin
            .from("coupons")
            .update({ use_count: c.use_count + 1 })
            .eq("coupon_code", code)
            .eq("use_count", c.use_count)
        : supabaseAdmin
            .from("coupons")
            .update({ use_count: c.use_count + 1 })
            .eq("coupon_code", code)
            .eq("use_count", c.use_count)
            .lt("use_count", c.max_uses);
    const { error: bumpErr, count } = await guard.select("*", {
      count: "exact",
      head: true,
    });
    if (bumpErr) throw new Error(bumpErr.message);
    if (!count || count < 1)
      throw new Error("This code was just claimed. Please try another.");

    // Flip tier + record code used
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ tier: "pro", coupon_code_used: code })
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true as const, tier: "pro" as const };
  });
