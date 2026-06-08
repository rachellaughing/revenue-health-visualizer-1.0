import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

type PriceInfo = {
  ok: boolean;
  id: string;
  status: number;
  error?: string;
  nickname?: string | null;
  unit_amount?: number | null;
  currency?: string;
  recurring_interval?: string | null;
  active?: boolean;
  product?: string;
};

async function fetchPrice(envName: string, key: string): Promise<PriceInfo> {
  const id = process.env[envName];
  if (!id) return { ok: false, id: "", status: 0, error: `${envName} not set` };
  const { ok, status, body } = await stripeGet(`/prices/${id}`, key);
  if (!ok) {
    return { ok: false, id, status, error: body?.error?.message ?? `HTTP ${status}` };
  }
  return {
    ok: true,
    id,
    status,
    nickname: body.nickname,
    unit_amount: body.unit_amount,
    currency: body.currency,
    recurring_interval: body.recurring?.interval ?? null,
    active: body.active,
    product: body.product,
  };
}

export const checkStripeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return {
        account: { ok: false, error: "STRIPE_SECRET_KEY not set" as const },
        monthly: { ok: false, id: "", status: 0, error: "skipped" } as PriceInfo,
        annual: { ok: false, id: "", status: 0, error: "skipped" } as PriceInfo,
        webhookSecretSet: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      };
    }

    const acct = await stripeGet("/account", key);
    const account = acct.ok
      ? {
          ok: true as const,
          id: acct.body.id as string,
          email: (acct.body.email as string | null) ?? null,
          livemode: acct.body.livemode as boolean,
          country: acct.body.country as string,
          business_name:
            (acct.body.business_profile?.name as string | null) ?? null,
        }
      : {
          ok: false as const,
          error: acct.body?.error?.message ?? `HTTP ${acct.status}`,
        };

    const [monthly, annual] = await Promise.all([
      fetchPrice("STRIPE_PRICE_PRO_MONTHLY", key),
      fetchPrice("STRIPE_PRICE_PRO_ANNUAL", key),
    ]);

    return {
      account,
      monthly,
      annual,
      webhookSecretSet: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    };
  });
