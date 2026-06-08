import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  createProCheckoutSession,
  getCurrentTier,
} from "@/lib/stripe-checkout.functions";

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  tealBright: "#4ABFC4",
  mid: "#888880",
  ink: "#111111",
  white: "#FFFFFF",
};

export function BillingTab({ success }: { success?: boolean }) {
  const tierFn = useServerFn(getCurrentTier);
  const checkoutFn = useServerFn(createProCheckoutSession);

  const tierQ = useQuery({
    queryKey: ["current-tier"],
    queryFn: () => tierFn(),
  });

  const checkout = useMutation({
    mutationFn: () => checkoutFn(),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  const tier = tierQ.data?.tier ?? "starter";
  const isPro = tier === "pro";
  const isDiag = tier === "diagnostic";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {success && (
        <div
          style={{
            padding: "14px 18px",
            background: "#E8F5E9",
            border: "1px solid #A5D6A7",
            borderRadius: 10,
            fontSize: 14,
            color: "#1B5E20",
          }}
        >
          You're now on Revenue Health Assessment™. All 10 subsystems and full reports are unlocked.
        </div>
      )}

      {/* Current plan card */}
      <div
        style={{
          background: T.white,
          border: `1px solid #F0EFEA`,
          borderRadius: 14,
          padding: "24px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.mid, letterSpacing: "0.08em", marginBottom: 6 }}>
              CURRENT PLAN
            </div>
            <div
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 28,
                color: T.ink,
              }}
            >
              {tierQ.isLoading
                ? "Loading…"
                : isDiag
                ? "Revenue Health Diagnostic™"
                : isPro
                ? "Revenue Health Assessment™"
                : "Revenue Health Snapshot™"}
            </div>
            <div style={{ fontSize: 13, color: T.mid, marginTop: 6 }}>
              {isDiag
                ? "Full access plus team seats and consultant view."
                : isPro
                ? "All 50 child systems, full report, PDF export, history."
                : "3 child systems per parent. Upgrade to unlock the full Health Check."}
            </div>
          </div>
          <TierBadge tier={tier} />
        </div>
        {isPro && (
          <div style={{ fontSize: 12, color: T.mid, marginTop: 16 }}>
            Manage your subscription via Stripe — billing portal coming soon.
          </div>
        )}
      </div>

      {/* Snapshot → upsell to Assessment */}
      {!isPro && !isDiag && (
        <div
          style={{
            background: T.abyss,
            color: T.white,
            borderRadius: 14,
            padding: "28px 32px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.tealBright,
              letterSpacing: "0.12em",
              marginBottom: 10,
            }}
          >
            UPGRADE · $197 ONE-TIME
          </div>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 30,
              lineHeight: 1.2,
              marginBottom: 10,
            }}
          >
            Revenue Health Assessment™
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.78)",
              margin: "0 0 20px",
            }}
          >
            Unlock all 50 child systems, the full Revenue Health report, PDF export, and Health Check history.
          </p>
          <ul
            style={{
              margin: "0 0 24px",
              paddingLeft: 20,
              fontSize: 13,
              lineHeight: 1.9,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <li>All 50 child systems across 5 revenue systems</li>
            <li>Full Revenue Health report with named gaps</li>
            <li>PDF export and quarterly Health Check history</li>
          </ul>

          <button
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            style={{
              background: T.ember,
              color: T.white,
              border: "none",
              padding: "14px 28px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: checkout.isPending ? "wait" : "pointer",
            }}
          >
            {checkout.isPending ? "Redirecting to checkout…" : "Upgrade to Assessment™ — $197"}
          </button>

          {checkout.error && (
            <div style={{ marginTop: 14, fontSize: 13, color: "#FFB4A0" }}>
              {(checkout.error as Error).message}
            </div>
          )}
        </div>
      )}

      {/* Diagnostic muted card — always visible */}
      <Link
        to="/diagnostic"
        style={{
          display: "block",
          background: T.offWhite,
          border: "1px solid #E5E5DF",
          borderRadius: 14,
          padding: "20px 24px",
          color: T.ink,
          textDecoration: "none",
        }}
      >
        <div style={{ fontSize: 11, color: T.mid, letterSpacing: "0.08em", marginBottom: 4 }}>
          REVENUE HEALTH DIAGNOSTIC™
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>
          Ready for the full Diagnostic? Book a discovery call →
        </div>
        <div style={{ fontSize: 13, color: T.mid, marginTop: 4 }}>
          Facilitated PBJ session, consultant view, team seats included.
        </div>
      </Link>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const label = tier === "diagnostic" ? "DIAGNOSTIC" : tier === "pro" ? "ASSESSMENT" : "SNAPSHOT";
  const bg = tier === "diagnostic" ? "#223F99" : tier === "pro" ? "#2A6B6E" : "#888880";
  return (
    <span
      style={{
        background: bg,
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "6px 10px",
        borderRadius: 6,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
