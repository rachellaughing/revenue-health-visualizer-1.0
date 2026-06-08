import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

export const createProCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    if (!priceId) throw new Error("STRIPE_PRICE_PRO_MONTHLY not set");

    const userId = context.userId;
    const email =
      (context.claims as { email?: string } | undefined)?.email ?? undefined;

    // Build absolute origin from request headers
    const proto = getRequestHeader("x-forwarded-proto") ?? "https";
    const host =
      getRequestHeader("x-forwarded-host") ?? getRequestHeader("host") ?? "";
    const origin = `${proto}://${host}`;

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("success_url", `${origin}/settings/billing?success=true`);
    params.set("allow_promotion_codes", "true");
    params.set("cancel_url", `${origin}/settings/billing`);
    params.set("client_reference_id", userId);
    if (email) params.set("customer_email", email);
    params.set("metadata[user_id]", userId);
    params.set("metadata[tier]", "pro");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error?.message ?? `Stripe HTTP ${res.status}`);
    }
    return { url: body.url as string };
  });

export const getCurrentTier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { tier: (data?.tier as string | null) ?? "starter" };
  });
