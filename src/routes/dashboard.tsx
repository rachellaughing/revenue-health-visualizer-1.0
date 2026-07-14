import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Lock, ArrowRight } from "lucide-react";
import { getDashboardData, type DashboardData } from "@/lib/dashboard.functions";
import { getViewerContext } from "@/lib/viewer.functions";
import {
  getHealthCheckData,
  updateSelectedChildIds,
} from "@/lib/healthcheck.functions";
import { TeamMemberDashboard } from "@/components/team-member-dashboard";
import {
  getIllustrativeScores,
  getOverall,
  quarterOf,
  nextQuarter,
  type SystemScore,
} from "@/lib/illustrative-scores";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Revenue Health Visualiser" }] }),
  component: DashboardPage,
});


const TIER_LABEL: Record<string, string> = {
  starter: "Revenue Health Snapshot™",
  pro: "Revenue Health Assessment™",
  diagnostic: "Revenue Health Diagnostic™",
};

function DashboardPage() {
  const viewerQ = useQuery({
    queryKey: ["viewer-context"],
    queryFn: () => getViewerContext(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    enabled: viewerQ.data?.role !== "team_member",
  });

  if (viewerQ.data?.role === "team_member") {
    return <TeamMemberDashboard viewer={viewerQ.data} />;
  }


  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--mm-paper)] p-8">
        <p className="text-sm text-[var(--mm-mid)]">Loading your dashboard…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-sm text-destructive">
        Failed to load dashboard: {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  const profile = data.profile;
  const latest = data.latestAssessment;

  const isReturning =
    !!profile?.profile_complete &&
    !!profile?.company_profile_complete &&
    !!latest &&
    latest.status === "completed";

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-[var(--mm-mid)]">Setting up your profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--mm-paper)] px-9 py-8">
      <div className="mx-auto max-w-[1140px]">
        {isReturning ? (
          <div className="mx-auto max-w-[880px]">
            <ReturningView data={data} />
          </div>
        ) : (
          <NewUserView data={data} />
        )}
      </div>
    </div>
  );
}



/* ─────────────────────────  NEW USER  ───────────────────────── */

function NewUserView({ data }: { data: DashboardData }) {
  const profile = data.profile!;
  const firstName = profile.first_name || "there";
  const tier = profile.tier || "starter";

  return (
    <>
      {/* Hero */}
      <section className="relative mb-7 overflow-hidden rounded-[14px] bg-[var(--mm-abyss)] px-9 py-8">
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-[280px] opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle at 80% 50%, var(--mm-teal-bright), transparent 70%)",
          }}
        />
        <div className="relative grid gap-9 md:grid-cols-[1fr_300px]">
          {/* Left column — framework credibility */}
          <div className="flex flex-col gap-5">
            <p className="text-[16px] font-semibold text-white" style={{ fontFamily: "Inter, sans-serif" }}>
              A prompt didn’t create the Revenue Health Matrix™.
            </p>
            <p className="m-0 max-w-[540px] text-sm leading-[1.65] text-white/60">
              After years of watching the same patterns surface inside founder-led companies — the
              same invisible friction, the same structural gaps disguised as execution problems —
              this framework was built to expose what you can’t see from the inside.
            </p>

            <div className="rounded-r-lg border-l-4 border-[var(--mm-ember)] bg-white/[0.05] px-4 py-3.5">
              <p
                className="m-0 text-[17px] italic leading-[1.4] text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Like smell blindness — you don’t notice what’s been there all along until someone
                else points it out.
              </p>
            </div>
            <p className="m-0 text-xs italic text-white/60">
              The methodology wasn’t generated. It was built.
            </p>

            <div className="flex items-center">
              <div className="flex-1 px-3 text-center">
                <div
                  className="text-[28px] leading-none text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  5
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
                  Systems
                </div>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="flex-1 px-3 text-center">
                <div
                  className="text-[28px] leading-none text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  10
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
                  Subsystems
                </div>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="flex-1 px-3 text-center">
                <div
                  className="text-[28px] leading-none text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  200
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
                  Questions
                </div>
              </div>
            </div>

            <p className="m-0 text-xs italic text-white/50">
              Start with the Snapshot — 3 subsystems, right now.
            </p>
          </div>

          {/* Right column — action card */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-[#1C2B2B] p-6">
            <h3
              className="m-0 mb-1 text-[20px] text-white"
              style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
            >
              Let’s get started.
            </h3>
            <p className="m-0 mb-5 text-xs text-white/60">
              Complete your profile first, then take your first Health Check.
            </p>

            <div className="mb-5 space-y-3">
              {[
                "Complete your personal profile",
                "Complete your company profile",
                "Start your Health Check",
                "View your Revenue Health Report",
              ].map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/30 text-[11px] text-white">
                    {i + 1}
                  </div>
                  <span className="text-[13px] text-white/90">{label}</span>
                </div>
              ))}
            </div>

            <Link
              to="/profile/personal"
              className="mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--mm-ember)] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Complete Your Profile <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="https://marketplacemaven.com/revenue-architecture-matrix/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-lg border border-white/30 bg-transparent px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
            >
              Learn about the framework
            </a>
          </div>
        </div>
      </section>

      {/* Two column */}
      <div className="mb-7 grid gap-[22px] md:grid-cols-[1fr_300px]">
        <GettingStarted data={data} />
        <TierIncluded tier={tier} />
      </div>

      <FrameworkExplainer
        context="dashboard"
        defaultOpen={false}
        parents={data.framework.parents}
        children={data.framework.children}
        selectedChildCodes={
          data.latestAssessment?.selected_child_ids ?? []
        }
        tier={data.profile?.tier ?? "starter"}
      />
    </>
  );
}

function GettingStarted({ data }: { data: DashboardData }) {
  const p = data.profile!;
  const steps = [
    {
      label: "Complete your personal profile",
      done: p.profile_complete,
      locked: false,
      cta: "Go to Profile",
      href: "/profile/personal" as const,
    },
    {
      label: "Complete your company profile",
      done: p.company_profile_complete,
      locked: false,
      cta: "Go to Profile",
      href: "/profile/company" as const,
    },
    {
      label: "Start your Health Check",
      done: p.assessment_status !== "not_started",
      locked: !p.profile_complete || !p.company_profile_complete,
      cta: "Start now",
      href: "/health-check" as const,
    },
    {
      label: "View your Revenue Health Report",
      done: false,
      locked: p.assessment_status !== "complete" && p.assessment_status !== "completed",
      cta: "View report",
      href: "/reports/executive-summary" as const,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const pct = (done / steps.length) * 100;

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(24,40,41,0.06)]">
      <div className="mb-3.5 flex items-center justify-between">
        <h3
          className="m-0 text-[17px] text-[var(--mm-ink)]"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          Getting Started
        </h3>
        <span className="text-[11px] text-[var(--mm-mid)]">
          {done} of {steps.length} complete
        </span>
      </div>
      <div className="mb-[18px] h-1 rounded-sm bg-[var(--mm-off-white)]">
        <div
          className="h-full rounded-sm bg-[var(--mm-teal-bright)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2.5"
          style={{
            borderBottom: i < steps.length - 1 ? "1px solid var(--mm-off-white)" : "none",
            opacity: step.locked ? 0.4 : 1,
          }}
        >
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{
              background: step.done ? "var(--mm-teal-bright)" : "transparent",
              border: step.done
                ? "2px solid var(--mm-teal-bright)"
                : "2px solid rgba(0,0,0,0.15)",
            }}
          >
            {step.done ? (
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            ) : (
              <span className="text-[10px] text-black/20">{i + 1}</span>
            )}
          </div>
          <span
            className="flex-1 text-[13px]"
            style={{
              fontWeight: step.done ? 400 : 500,
              color: step.done ? "var(--mm-mid)" : "var(--mm-ink)",
              textDecoration: step.done ? "line-through" : "none",
            }}
          >
            {step.label}
          </span>
          {!step.done && !step.locked && (
            <Link
              to={step.href}
              className="whitespace-nowrap text-[12px] font-medium text-[var(--mm-ember)] hover:underline"
            >
              {step.cta} →
            </Link>
          )}
          {step.locked && <Lock className="h-3 w-3 text-black/40" />}
        </div>
      ))}
    </div>
  );
}

function TierIncluded({ tier }: { tier: string }) {
  const content: Record<string, { items: { label: string; sub: string }[]; upgradeCta?: string }> =
    {
      starter: {
        items: [
          { label: "15 child systems evaluated", sub: "3 per parent system" },
          { label: "Revenue Health Report", sub: "Illustrative data for locked systems" },
          { label: "Getting Started Roadmap", sub: "Your top 3 priority actions" },
        ],
        upgradeCta: "Upgrade to Assessment™",
      },
      pro: {
        items: [
          { label: "All 50 child systems", sub: "Full revenue system coverage" },
          { label: "Full Revenue Health Report", sub: "PDF export + history" },
          { label: "Quarterly Health Checks", sub: "Track progress over time" },
        ],
        upgradeCta: "Upgrade to Diagnostic™",
      },
      diagnostic: {
        items: [
          { label: "Everything in Assessment™", sub: "All 50 child systems + reports" },
          { label: "Team seats & consultant view", sub: "Diagnostic-tier reports unlocked" },
          { label: "Team Alignment + Founder Dependency", sub: "Advanced diagnostic insights" },
        ],
      },
    };
  const c = content[tier] || content.starter;
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-[22px] shadow-[0_2px_8px_rgba(24,40,41,0.06)]">
      <h3
        className="m-0 mb-3.5 text-[16px] text-[var(--mm-ink)]"
        style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
      >
        Your {TIER_LABEL[tier].replace("Revenue Health ", "")} includes
      </h3>
      {c.items.map((item, i) => (
        <div key={i} className="mb-3.5 flex gap-2.5">
          <div className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[rgba(74,191,196,0.15)]">
            <Check className="h-2.5 w-2.5 text-[var(--mm-teal-bright)]" strokeWidth={3} />
          </div>
          <div>
            <div className="text-[12px] font-medium text-[var(--mm-ink)]">{item.label}</div>
            <div className="mt-px text-[11px] text-[var(--mm-mid)]">{item.sub}</div>
          </div>
        </div>
      ))}
      {c.upgradeCta && (
        <div className="mt-3.5 border-t border-[var(--mm-off-white)] pt-3.5">
          <div className="mb-2.5 text-[11px] text-[var(--mm-mid)]">Want the full picture?</div>
          <button
            type="button"
            className="w-full rounded-lg border-[1.5px] border-[var(--mm-teal)] bg-transparent px-2 py-[9px] text-[12px] font-medium text-[var(--mm-teal)] transition-opacity hover:opacity-85"
          >
            {c.upgradeCta}
          </button>
        </div>
      )}
    </div>
  );
}


/* ─────────────────────────  RETURNING USER  ───────────────────────── */

function ReturningView({ data }: { data: DashboardData }) {
  const p = data.profile!;
  const latest = data.latestAssessment!;
  const submittedAt = latest.submitted_at ? new Date(latest.submitted_at) : new Date(latest.created_at!);
  const lastQ = quarterOf(submittedAt);
  const nextQ = nextQuarter(submittedAt);

  const scores: SystemScore[] = getIllustrativeScores(latest.id);
  const overall = data.hasScores && data.overallScore !== null ? data.overallScore : getOverall(scores);

  const weakest = scores.reduce((a, b) => (a.score <= b.score ? a : b));
  const tier = p.tier || "starter";
  const teamUnlocked = tier === "pro" || tier === "diagnostic";

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2
            className="m-0 mb-1 text-[24px] text-[var(--mm-ink)]"
            style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
          >
            Welcome back, {p.first_name}.
          </h2>
          <p className="m-0 text-[13px] text-[var(--mm-mid)]">
            {p.business_name ? `${p.business_name} · ` : ""}Last Health Check: {lastQ.label}
          </p>
        </div>
        <Link
          to="/reports/executive-summary"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--mm-ember)] px-[22px] py-[11px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          View Full Report <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Score panel */}
      <section className="mb-6 grid items-center gap-7 rounded-[14px] bg-[var(--mm-abyss)] px-7 py-6 md:grid-cols-[84px_1fr]">
        <div className="text-center">
          <ScoreRing score={overall} color="var(--mm-teal-bright)" size={76} />
          <div className="mt-1.5 text-[9px] font-bold tracking-[0.1em] text-white/40">OVERALL</div>
        </div>
        <div className="grid gap-x-7 gap-y-2.5 md:grid-cols-2">
          {scores.map((sys) => (
            <div key={sys.id}>
              <div className="mb-1 flex justify-between">
                <span className="text-[11px] font-medium text-white/70">{sys.label}</span>
                <span className="text-[11px] font-bold" style={{ color: sys.colorVar }}>
                  {sys.score.toFixed(1)}
                </span>
              </div>
              <div className="h-1 rounded-sm bg-white/[0.08]">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${(sys.score / 4) * 100}%`,
                    background: sys.colorVar,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Insight cards */}
      <div className="mb-[22px] grid gap-[18px] md:grid-cols-3">
        <InsightCard
          label="Weakest System"
          title={weakest.label}
          value={`${weakest.score.toFixed(1)} / 4.0`}
          sub="This system shows the largest gap. Prioritise it in your roadmap."
          color={weakest.colorVar}
          cta="View System Report"
          href="/reports/revenue-system-health"
        />
        <InsightCard
          label="Top Priority"
          title="Address your weakest system"
          value="Critical Path"
          sub="Strengthening your weakest system unlocks compounding improvements across the matrix."
          color="var(--mm-ember)"
          cta="View Roadmap"
          href="/revenue/roadmap-builder"
        />
        <InsightCard
          label="Team Health Check"
          title={teamUnlocked ? "Invite your team" : "Locked"}
          value={teamUnlocked ? "Diagnostic feature" : "Upgrade required"}
          sub={
            teamUnlocked
              ? "Get a multi-perspective Health Check from your revenue team."
              : "Team Alignment is available on Revenue Health Assessment™ and Diagnostic™."
          }
          color="var(--mm-sys-authority)"
          cta={teamUnlocked ? "Manage team" : "See plans"}
          href={teamUnlocked ? "/settings/team" : "/settings/billing"}
        />
      </div>

      {/* Reassess nudge */}
      <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[rgba(42,107,110,0.18)] bg-[rgba(42,107,110,0.07)] px-[22px] py-3.5">
        <div>
          <span className="text-[13px] font-medium text-[var(--mm-teal)]">
            Your last Health Check was completed in {lastQ.monthYear}.{" "}
          </span>
          <span className="text-[12px] text-[var(--mm-mid)]">
            Ready for your {nextQ.label} Health Check?
          </span>
        </div>
        <Link
          to="/health-check"
          className="whitespace-nowrap rounded-lg border-[1.5px] border-[var(--mm-teal)] px-4 py-2 text-[12px] font-medium text-[var(--mm-teal)] transition-opacity hover:opacity-85"
        >
          Start {nextQ.label} Health Check
        </Link>
      </div>
    </>
  );
}

function InsightCard({
  label,
  title,
  value,
  sub,
  color,
  cta,
  href,
}: {
  label: string;
  title: string;
  value: string;
  sub: string;
  color: string;
  cta: string;
  href: string;
}) {
  return (
    <div
      className="rounded-xl border border-black/[0.08] bg-white p-[18px] shadow-[0_2px_8px_rgba(24,40,41,0.06)]"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="mb-1.5 text-[9px] font-bold tracking-[0.1em] text-[var(--mm-mid)]">
        {label.toUpperCase()}
      </div>
      <div
        className="mb-1 text-[15px] text-[var(--mm-ink)]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </div>
      <div className="mb-1.5 text-[12px] font-bold" style={{ color }}>
        {value}
      </div>
      <p className="m-0 mb-3 text-[11px] leading-[1.5] text-[var(--mm-mid)]">{sub}</p>
      <Link to={href} className="text-[11px] font-medium text-[var(--mm-teal)] hover:underline">
        {cta} →
      </Link>
    </div>
  );
}

function ScoreRing({ score, color, size = 56 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 4) * circ;
  return (
    <svg width={size} height={size} className="inline-block">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
        />
      </g>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontSize={size * 0.24}
        fontFamily="Inter"
        fontWeight={600}
      >
        {score.toFixed(1)}
      </text>
    </svg>
  );
}
