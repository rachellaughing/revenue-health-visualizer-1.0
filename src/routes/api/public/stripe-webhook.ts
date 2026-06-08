import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    }),
  ) as Record<string, string>;
  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;

  // Tolerance check
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;

  const signed = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
          return new Response("Server misconfigured", { status: 500 });
        }

        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!verifyStripeSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 400 });
        }

        let event: { type: string; data: { object: Record<string, unknown> } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as {
            payment_status?: string;
            client_reference_id?: string | null;
            metadata?: Record<string, string> | null;
          };

          if (session.payment_status === "paid") {
            const userId =
              session.client_reference_id ?? session.metadata?.user_id ?? null;

            if (userId) {
              const { supabaseAdmin } = await import(
                "@/integrations/supabase/client.server"
              );
              const { error } = await supabaseAdmin
                .from("profiles")
                .update({ tier: "pro", updated_at: new Date().toISOString() })
                .eq("user_id", userId);
              if (error) {
                console.error("[stripe-webhook] profile update failed", error);
                return new Response("DB update failed", { status: 500 });
              }
            } else {
              console.warn(
                "[stripe-webhook] checkout.session.completed without user_id",
              );
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
