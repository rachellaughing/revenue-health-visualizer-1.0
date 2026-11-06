import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createProCheckoutSession,
  getCurrentTier,
} from "@/lib/stripe-checkout.functions";
import { validateCoupon, redeemCoupon } from "@/lib/coupon.functions";
import { fetchViewerContextSafe } from "@/lib/viewer-query";


export function BillingTab({ success }: { success?: boolean }) {
  const viewerQ = useQuery({
    queryKey: ["viewer-context"],
    queryFn: fetchViewerContextSafe,
  });
  if (viewerQ.data?.role === "team_member") {
    return <MemberBillingPanel viewer={viewerQ.data} />;
  }

  const tierFn = useServerFn(getCurrentTier);
  const checkoutFn = useServerFn(createProCheckoutSession);
  const validateFn = useServerFn(validateCoupon);
  const redeemFn = useServerFn(redeemCoupon);
  const queryClient = useQueryClient();

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

  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<null | {
    code: string;
    free: boolean;
  }>(null);
  const [couponMsg, setCouponMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const apply = useMutation({
    mutationFn: (code: string) => validateFn({ data: { code } }),
    onSuccess: (res) => {
      if (res.valid) {
        setApplied({ code: res.code, free: res.free });
        setCouponMsg({
          kind: "ok",
          text: res.free
            ? `${res.code} applied — free upgrade unlocked.`
            : `${res.code} applied — discount will show at checkout.`,
        });
      } else {
        setApplied(null);
        setCouponMsg({ kind: "err", text: res.reason });
      }
    },
    onError: (e) => {
      setApplied(null);
      setCouponMsg({ kind: "err", text: (e as Error).message });
    },
  });

  const redeem = useMutation({
    mutationFn: (code: string) => redeemFn({ data: { code } }),
    onSuccess: () => {
      setApplied(null);
      setCodeInput("");
      setCouponMsg({ kind: "ok", text: "Upgrade complete — welcome to Assessment™." });
      queryClient.invalidateQueries({ queryKey: ["current-tier"] });
    },
    onError: (e) =>
      setCouponMsg({ kind: "err", text: (e as Error).message }),
  });


  const tier = tierQ.data?.tier ?? "starter";
  const isPro = tier === "pro";
  const isDiag = tier === "diagnostic";

  return (
    <div className="mm-stack mm-gap-lg">
      {success && (
        <div className="mm-notice--success">
          You're now on Revenue Health Assessment™. All 10 subsystems and full reports are unlocked.
        </div>
      )}

      {/* Current plan card */}
      <div className="mm-bill-card">
        <div className="mm-row mm-bill-row mm-gap-md justify-between">
          <div>
            <div className="mm-bill-kicker">CURRENT PLAN</div>
            <div className="mm-bill-plan">
              {tierQ.isLoading
                ? "Loading…"
                : isDiag
                ? "Revenue Health Diagnostic™"
                : isPro
                ? "Revenue Health Assessment™"
                : "Revenue Health Snapshot™"}
            </div>
            <div className="mm-bill-note">
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
          <div className="mm-bill-note text-xs mm-mt-sm">
            Manage your subscription via Stripe — billing portal coming soon.
          </div>
        )}
      </div>

      {/* Snapshot → upsell to Assessment */}
      {!isPro && !isDiag && (
        <div className="mm-upsell">
          <div className="mm-upsell__kicker">UPGRADE · $197 ONE-TIME</div>
          <div className="mm-upsell__title">Revenue Health Assessment™</div>
          <p className="mm-upsell__body">
            Unlock all 50 child systems, the full Revenue Health report, PDF export, and Health Check history.
          </p>
          <ul className="mm-upsell__list">
            <li>All 50 child systems across 5 revenue systems</li>
            <li>Full Revenue Health report with named gaps</li>
            <li>PDF export and quarterly Health Check history</li>
          </ul>

          {applied?.free ? (
            <button
              onClick={() => redeem.mutate(applied.code)}
              disabled={redeem.isPending}
              className="mm-btn-ember"
            >
              {redeem.isPending ? "Redeeming…" : "Redeem code & upgrade — Free"}
            </button>
          ) : (
            <button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
              className="mm-btn-ember"
            >
              {checkout.isPending ? "Redirecting to checkout…" : "Upgrade to Assessment™ — $197"}
            </button>
          )}

          {checkout.error && (
            <div className="mm-upsell__err">{(checkout.error as Error).message}</div>
          )}

          {/* Coupon row */}
          <div className="mm-upsell__coupon">
            <div className="mm-upsell__kicker">HAVE A CODE?</div>
            <div className="mm-row mm-gap-xs">
              <input
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  if (applied) setApplied(null);
                  if (couponMsg) setCouponMsg(null);
                }}
                placeholder="Enter beta or promo code"
                aria-label="Promo code"
                spellCheck={false}
                autoCapitalize="characters"
                className="mm-upsell__input"
              />
              <button
                onClick={() => apply.mutate(codeInput.trim())}
                disabled={!codeInput.trim() || apply.isPending}
                className="mm-upsell__apply"
              >
                {apply.isPending ? "Checking…" : "Apply"}
              </button>
            </div>
            {couponMsg && (
              <div className={couponMsg.kind === "ok" ? "mm-upsell__ok" : "mm-upsell__err"}>
                {couponMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagnostic muted card — always visible */}
      <Link to="/diagnostic" className="mm-bill-card">
        <div className="mm-bill-kicker">REVENUE HEALTH DIAGNOSTIC™</div>
        <div className="text-[15px] font-semibold">
          Ready for the full Diagnostic? Book a discovery call →
        </div>
        <div className="mm-bill-note">
          Facilitated PBJ session, consultant view, team seats included.
        </div>
      </Link>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const label = tier === "diagnostic" ? "DIAGNOSTIC" : tier === "pro" ? "ASSESSMENT" : "SNAPSHOT";
  const mod = tier === "diagnostic" ? "mm-tier-badge--diagnostic" : tier === "pro" ? "mm-tier-badge--pro" : "";
  return <span className={`mm-tier-badge ${mod}`}>{label}</span>;
}

function MemberBillingPanel({
  viewer,
}: {
  viewer: { firstName: string | null; teamMember?: { ownerFirstName: string | null; ownerLastName: string | null; ownerEmail: string | null } };
}) {
  const tm = viewer.teamMember;
  const ownerFirst = tm?.ownerFirstName ?? "your team owner";
  const ownerLast = tm?.ownerLastName ?? "";
  const ownerEmail = tm?.ownerEmail ?? null;
  const memberFirst = viewer.firstName ?? "your teammate";
  const ownerFullName = `${ownerFirst}${ownerLast ? " " + ownerLast : ""}`;

  const subject = "Revenue Health Diagnostic — worth a look";
  const body = `Hey ${ownerFirst},

I just finished my Revenue Health Check. Based on what I'm seeing from my seat, I think it's worth exploring the Revenue Health Diagnostic™ — the team alignment data alone seems worth the conversation.

— ${memberFirst}`;
  const mailto = ownerEmail
    ? `mailto:${ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  return (
    <div className="mm-stack mm-gap-lg">
      {/* Current plan card */}
      <div className="mm-bill-card">
        <div className="mm-bill-kicker">CURRENT PLAN</div>
        <div className="mm-bill-plan mm-mb-sm">Revenue Health Assessment™</div>
        <div className="mm-bill-body m-0">
          Your access is provided through {ownerFullName}'s organization.
          {ownerEmail ? (
            <>
              {" "}To make changes to your plan, contact {ownerFirst} at{" "}
              <a href={`mailto:${ownerEmail}`} className="mm-bill-mail">
                {ownerEmail}
              </a>.
            </>
          ) : (
            <> To make changes to your plan, contact {ownerFirst}.</>
          )}
        </div>
      </div>

      {/* Want to go deeper card */}
      <div className="mm-bill-card">
        <div className="mm-bill-h">Want to go deeper?</div>
        <p className="mm-bill-body">
          The Revenue Health Diagnostic™ includes a facilitated session where
          your team's alignment gaps are reviewed together — with a consultant
          in the room.
        </p>
        <p className="mm-bill-body mm-mb-lg">
          If you think your organization is ready for that conversation, let{" "}
          {ownerFirst} know.
        </p>
        {mailto && (
          <a href={mailto} className="mm-btn-ember inline-block no-underline">
            Send {ownerFirst} a nudge →
          </a>
        )}
      </div>
    </div>
  );
}
