import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { checkStripeConnection } from "@/lib/stripe-check.functions";

export const Route = createFileRoute("/diagnostic")({
  head: () => ({ meta: [{ title: "Book a Diagnostic — Revenue Health Diagnostic™" }] }),
  component: Page,
});

const T = {
  abyss: "#182829", paper: "#FFFEFA", offWhite: "#F5F5F0",
  ember: "#F05223", teal: "#2A6B6E", tealBright: "#4ABFC4",
  mid: "#888880", ink: "#111111", white: "#FFFFFF",
};

function fmtMoney(cents?: number | null, currency?: string) {
  if (cents == null || !currency) return "—";
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function StripeCheckCard() {
  const checkFn = useServerFn(checkStripeConnection);
  const m = useMutation({ mutationFn: () => checkFn() });

  const box: React.CSSProperties = {
    marginTop: 40, padding: 24, border: `1px solid ${T.offWhite}`,
    borderRadius: 12, fontFamily: "Inter", fontSize: 13, color: T.ink,
  };
  const row: React.CSSProperties = { padding: "8px 0", borderBottom: `1px solid ${T.offWhite}` };

  const d = m.data;

  return (
    <div style={box}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Stripe connection check</div>
      <div style={{ color: T.mid, marginBottom: 14 }}>
        Temporary diagnostic — verifies STRIPE_SECRET_KEY and both price IDs before building checkout.
      </div>
      <button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        style={{
          background: T.ember, color: T.white, border: "none",
          padding: "10px 18px", borderRadius: 8, fontWeight: 700,
          fontSize: 13, cursor: m.isPending ? "wait" : "pointer",
        }}
      >
        {m.isPending ? "Checking…" : "Run check"}
      </button>

      {m.error && (
        <div style={{ marginTop: 14, color: "#b00020" }}>
          Request failed: {(m.error as Error).message}
        </div>
      )}

      {d && (
        <div style={{ marginTop: 18 }}>
          <div style={row}>
            <strong>{d.account.ok ? "✅" : "❌"} API key</strong>
            {d.account.ok ? (
              <div style={{ color: T.mid, marginTop: 4 }}>
                {d.account.id} · {d.account.email ?? "no email"} · livemode: {String(d.account.livemode)} · {d.account.country}
                {d.account.business_name ? ` · ${d.account.business_name}` : ""}
              </div>
            ) : (
              <div style={{ color: "#b00020", marginTop: 4 }}>{d.account.error}</div>
            )}
          </div>

          <div style={row}>
            <strong>{d.monthly.ok ? "✅" : "❌"} STRIPE_PRICE_PRO_MONTHLY</strong>
            <div style={{ color: T.mid, marginTop: 4 }}>
              {d.monthly.id || "(unset)"}
              {d.monthly.ok ? (
                <> · {fmtMoney(d.monthly.unit_amount, d.monthly.currency)} / {d.monthly.recurring_interval ?? "one-time"} · active: {String(d.monthly.active)} · {d.monthly.nickname ?? "no nickname"}</>
              ) : (
                <span style={{ color: "#b00020" }}> · {d.monthly.error}</span>
              )}
            </div>
          </div>

          <div style={row}>
            <strong>{d.annual.ok ? "✅" : "❌"} STRIPE_PRICE_PRO_ANNUAL</strong>
            <div style={{ color: T.mid, marginTop: 4 }}>
              {d.annual.id || "(unset)"}
              {d.annual.ok ? (
                <> · {fmtMoney(d.annual.unit_amount, d.annual.currency)} / {d.annual.recurring_interval ?? "one-time"} · active: {String(d.annual.active)} · {d.annual.nickname ?? "no nickname"}</>
              ) : (
                <span style={{ color: "#b00020" }}> · {d.annual.error}</span>
              )}
            </div>
          </div>

          <div style={{ padding: "8px 0" }}>
            <strong>{d.webhookSecretSet ? "✅" : "⚠️"} STRIPE_WEBHOOK_SECRET</strong>
            <div style={{ color: T.mid, marginTop: 4 }}>
              {d.webhookSecretSet ? "Set (not verified until webhook route exists)" : "Not set"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Page() {
  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE HEALTH DIAGNOSTIC™
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 40, fontWeight: 400, color: T.ink, margin: "0 0 16px", lineHeight: 1.15 }}>
          Book your Revenue Health Diagnostic™
        </h1>
        <p style={{ fontFamily: "Inter", fontSize: 15, color: T.mid, lineHeight: 1.7, margin: "0 0 32px" }}>
          The Diagnostic is a consultant-led engagement that surfaces every shadow system, founder dependency, and revenue risk in your business. Each engagement includes a series of PBJ Sessions with your team, full documentation of what we find, and a sequenced action plan.
        </p>

        <div style={{
          background: T.abyss, borderRadius: 16, padding: "32px 36px", marginBottom: 24,
          color: T.white,
        }}>
          <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 10 }}>
            WHAT'S INCLUDED
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontFamily: "Inter", fontSize: 14, lineHeight: 1.9, color: "rgba(255,255,255,0.85)" }}>
            <li>Full Revenue Health Assessment™ across all 50 child systems</li>
            <li>Team Alignment analysis — founder vs. team perceptions</li>
            <li>Founder Dependency mapping with blast-radius windows</li>
            <li>Shadow Systems discovery via PBJ Sessions</li>
            <li>Sequenced 90-day Roadmap with named owners</li>
          </ul>
        </div>

        <a href="https://marketplacemaven.com/diagnostic" target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-block", background: T.ember, color: T.white,
            fontFamily: "Inter", fontSize: 14, fontWeight: 700,
            padding: "14px 28px", borderRadius: 10, textDecoration: "none",
            marginRight: 12,
          }}>
          Schedule a Discovery Call →
        </a>
        <Link to="/dashboard" style={{
          display: "inline-block", color: T.mid,
          fontFamily: "Inter", fontSize: 13, textDecoration: "none",
        }}>← Back to dashboard</Link>

        <StripeCheckCard />

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, marginTop: 48, fontSize: 11, fontFamily: "Inter", color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
