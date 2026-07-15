import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, ArrowRight } from "lucide-react";
import { getDashboardData, type DashboardData } from "@/lib/dashboard.functions";
import { getViewerContext } from "@/lib/viewer.functions";
import {
  getHealthCheckData,
  updateSelectedChildIds,
} from "@/lib/healthcheck.functions";
import { getExecutiveSummary } from "@/lib/report.functions";
import { TeamMemberDashboard } from "@/components/team-member-dashboard";
import {
  quarterOf,
  nextQuarter,
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

const SYSTEM_COLORS: Record<string, string> = {
  Positioning: "#3B82F6",
  Authority: "#10B981",
  Conversion: "#E11D48",
  Lifecycle: "#8B5CF6",
  Visibility: "#F59E0B",
};
const ORDERED_SYSTEMS = [
  "Positioning",
  "Authority",
  "Conversion",
  "Lifecycle",
  "Visibility",
];
const FREE_LIMIT = 3;

function NewUserView({ data }: { data: DashboardData }) {
  const profile = data.profile!;
  const tier = (profile.tier || "starter") as "starter" | "pro" | "diagnostic";
  const isStarter = tier === "starter";

  return (
    <div className="flex flex-col gap-7">
      {/* Row 1 — dark, two columns */}
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <HeroCard isStarter={isStarter} />
        <SnapshotIncludesCard tier={tier} />
      </div>

      {/* Row 2 — light, two columns */}
      <div className="grid gap-6 md:grid-cols-[1fr_320px] items-start">
        {isStarter ? (
          <SubsystemPickerCard data={data} />
        ) : (
          <FullAccessCard data={data} />
        )}
        <div className="md:sticky md:top-6">
          <GettingStarted data={data} />
        </div>
      </div>

      {/* Row 3 — full width */}
      <AboutMatrixCard />
    </div>
  );
}

function HeroCard({ isStarter }: { isStarter: boolean }) {
  const stats = [
    { num: "5", label: "SYSTEMS", muted: false, note: null as string | null },
    {
      num: "10",
      label: "SUBSYSTEMS EACH",
      muted: isStarter,
      note: isStarter ? "3 in your Snapshot" : null,
    },
    {
      num: "200",
      label: "EVALUATION AREAS",
      muted: isStarter,
      note: isStarter ? "60 in your Snapshot" : null,
    },
  ];
  return (
    <section className="relative overflow-hidden rounded-[14px] bg-[var(--mm-abyss)] px-8 py-8">
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0 w-[280px] opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle at 80% 50%, var(--mm-teal-bright), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col gap-5">
        <p
          className="m-0 text-[22px] leading-[1.25] text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          A prompt didn’t create the Revenue Health Matrix™.
        </p>
        <p className="m-0 max-w-[560px] text-[13px] leading-[1.65] text-white/65">
          Five interconnected systems, built from years of pattern recognition
          inside founder-led companies — not generated. Here’s the shape of it.
        </p>

        <div className="mt-1 flex items-stretch border-t border-white/10 pt-5">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="flex-1 px-3"
              style={{
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.10)" : "none",
              }}
            >
              <div
                className="text-[30px] leading-none"
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  color: s.muted ? "rgba(255,254,250,0.4)" : "#FFFEFA",
                }}
              >
                {s.num}
              </div>
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
                {s.label}
              </div>
              {s.note && (
                <div className="mt-1 text-[10.5px] text-[#22BDC1]">
                  {s.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SnapshotIncludesCard({ tier }: { tier: "starter" | "pro" | "diagnostic" }) {
  const content: Record<string, { title: string; items: string[]; upgradeCta?: string }> = {
    starter: {
      title: "Your Snapshot™ includes",
      items: [
        "15 subsystems evaluated (3 per system)",
        "60 evaluation areas across all 5 systems",
        "Revenue Health Report with illustrative data for locked areas",
        "Getting Started Roadmap — your top 3 priorities",
      ],
      upgradeCta: "Upgrade to Assessment™",
    },
    pro: {
      title: "Your Assessment™ includes",
      items: [
        "All 50 subsystems — full system coverage",
        "200 evaluation areas across every system",
        "Full Revenue Health Report + PDF export",
        "Quarterly Health Checks with history",
      ],
      upgradeCta: "Upgrade to Diagnostic™",
    },
    diagnostic: {
      title: "Your Diagnostic™ includes",
      items: [
        "Everything in Assessment™",
        "Team seats & consultant view",
        "Team Alignment + Founder Dependency reports",
        "Priority support",
      ],
    },
  };
  const c = content[tier] || content.starter;
  return (
    <section className="rounded-[14px] border border-white/10 bg-[#1C2B2B] p-6 text-white">
      <h3
        className="m-0 mb-4 text-[18px]"
        style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
      >
        {c.title}
      </h3>
      <ul className="m-0 mb-4 list-none space-y-3 p-0">
        {c.items.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <div className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[rgba(74,191,196,0.18)]">
              <Check className="h-2.5 w-2.5 text-[var(--mm-teal-bright)]" strokeWidth={3} />
            </div>
            <span className="text-[12.5px] leading-[1.5] text-white/85">{item}</span>
          </li>
        ))}
      </ul>
      {c.upgradeCta && (
        <div className="border-t border-white/10 pt-4">
          <Link
            to="/settings/billing"
            className="block w-full rounded-lg border-[1.5px] border-[var(--mm-teal-bright)] px-2 py-[9px] text-center text-[12px] font-medium text-[var(--mm-teal-bright)] transition-opacity hover:opacity-85"
          >
            {c.upgradeCta}
          </Link>
        </div>
      )}
    </section>
  );
}

function SubsystemPickerCard({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const parents = useMemo(
    () =>
      [...data.framework.parents].sort((a, b) => {
        const ai = ORDERED_SYSTEMS.indexOf(a.name);
        const bi = ORDERED_SYSTEMS.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        return a.sort_order - b.sort_order;
      }),
    [data.framework.parents],
  );
  const childrenByParent = useMemo(() => {
    const m = new Map<string, typeof data.framework.children>();
    for (const c of data.framework.children) {
      const arr = m.get(c.parent_system_id) ?? [];
      arr.push(c);
      m.set(c.parent_system_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [data.framework.children]);

  // Seed picks from latestAssessment.selected_child_ids (UUIDs)
  const initialPicks = useMemo(() => {
    const picks: Record<string, string[]> = {};
    const selectedIds = new Set(data.latestAssessment?.selected_child_ids ?? []);
    for (const p of parents) {
      const kids = childrenByParent.get(p.id) ?? [];
      picks[p.id] = kids.filter((c) => selectedIds.has(c.id)).map((c) => c.code);
    }
    return picks;
  }, [parents, childrenByParent, data.latestAssessment?.selected_child_ids]);

  const [picks, setPicks] = useState<Record<string, string[]>>(initialPicks);
  const [assessmentId, setAssessmentId] = useState<string | null>(
    data.latestAssessment?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => Object.values(picks).reduce((n, arr) => n + arr.length, 0),
    [picks],
  );
  const allCodes = useMemo(() => Object.values(picks).flat(), [picks]);

  // Debounced auto-persist when an assessment already exists
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!assessmentId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSelectedChildIds({
        data: { assessment_id: assessmentId, selected_child_ids: allCodes },
      }).catch(() => {
        /* silent — Continue click will retry */
      });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [allCodes, assessmentId]);

  function toggle(parentId: string, code: string) {
    setPicks((prev) => {
      const cur = prev[parentId] ?? [];
      if (cur.includes(code)) {
        return { ...prev, [parentId]: cur.filter((c) => c !== code) };
      }
      if (cur.length >= FREE_LIMIT) return prev;
      return { ...prev, [parentId]: [...cur, code] };
    });
  }

  const continueMut = useMutation({
    mutationFn: async () => {
      let id = assessmentId;
      if (!id) {
        const hc = await getHealthCheckData();
        id = hc.assessment.id;
        setAssessmentId(id);
      }
      await updateSelectedChildIds({
        data: { assessment_id: id, selected_child_ids: allCodes },
      });
    },
    onSuccess: () => {
      navigate({ to: "/health-check" });
    },
    onError: (e: any) => setError(e?.message ?? "Could not save selection"),
  });

  const complete = total === 15;
  const remaining = 15 - total;

  return (
    <section className="rounded-[14px] border border-black/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(24,40,41,0.06)]">
      <div className="mb-1 flex items-baseline justify-between">
        <h3
          className="m-0 text-[20px] text-[var(--mm-ink)]"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          How the Health Check works
        </h3>
        <div className="text-[13px] font-semibold text-[var(--mm-ink)]">
          <span style={{ color: complete ? "var(--mm-teal)" : "var(--mm-ember)" }}>
            {total}
          </span>
          <span className="text-[var(--mm-mid)]"> / 15 selected</span>
        </div>
      </div>
      <p className="m-0 mb-5 text-[12.5px] leading-[1.55] text-[var(--mm-mid)]">
        Your Snapshot covers 3 subsystems per system. Pick the 3 you most want to
        evaluate — you can revisit any of them next quarter.
      </p>

      <div className="space-y-5">
        {parents.map((p) => {
          const color = SYSTEM_COLORS[p.name] ?? `#${p.color_hex}`;
          const kids = childrenByParent.get(p.id) ?? [];
          const chosen = picks[p.id] ?? [];
          const full = chosen.length >= FREE_LIMIT;
          return (
            <div key={p.id}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-[13px] font-semibold text-[var(--mm-ink)]">
                    {p.name}
                  </span>
                </div>
                <span
                  className="text-[11.5px]"
                  style={{
                    color: chosen.length === FREE_LIMIT ? color : "var(--mm-mid)",
                    fontWeight: chosen.length === FREE_LIMIT ? 600 : 400,
                  }}
                >
                  {chosen.length} of {FREE_LIMIT} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kids.map((c) => {
                  const isChosen = chosen.includes(c.code);
                  const disabled = !isChosen && full;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(p.id, c.code)}
                      disabled={disabled}
                      className="rounded-full border px-3 py-1.5 text-[11.5px] transition"
                      style={{
                        borderColor: isChosen
                          ? color
                          : disabled
                          ? "rgba(0,0,0,0.08)"
                          : "rgba(0,0,0,0.12)",
                        background: isChosen ? color : "transparent",
                        color: isChosen
                          ? "#FFFEFA"
                          : disabled
                          ? "rgba(0,0,0,0.25)"
                          : "var(--mm-ink)",
                        fontWeight: isChosen ? 600 : 400,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-[var(--mm-off-white)] pt-4">
        {error && (
          <div className="mb-2 text-[11.5px] text-[var(--mm-sys-visibility)]">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={() => continueMut.mutate()}
          disabled={!complete || continueMut.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition"
          style={{
            background: complete ? "var(--mm-ember)" : "rgba(0,0,0,0.06)",
            color: complete ? "#FFFEFA" : "var(--mm-mid)",
            cursor: complete && !continueMut.isPending ? "pointer" : "not-allowed",
          }}
        >
          {continueMut.isPending
            ? "Saving…"
            : complete
            ? "Continue to Health Check"
            : `Select ${remaining} more to continue`}
          {complete && !continueMut.isPending && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </section>
  );
}

function FullAccessCard({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const parents = useMemo(
    () =>
      [...data.framework.parents].sort((a, b) => {
        const ai = ORDERED_SYSTEMS.indexOf(a.name);
        const bi = ORDERED_SYSTEMS.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        return a.sort_order - b.sort_order;
      }),
    [data.framework.parents],
  );
  const childrenByParent = useMemo(() => {
    const m = new Map<string, typeof data.framework.children>();
    for (const c of data.framework.children) {
      const arr = m.get(c.parent_system_id) ?? [];
      arr.push(c);
      m.set(c.parent_system_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [data.framework.children]);

  return (
    <section className="rounded-[14px] border border-black/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(24,40,41,0.06)]">
      <h3
        className="m-0 mb-1 text-[20px] text-[var(--mm-ink)]"
        style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
      >
        You have full access
      </h3>
      <p className="m-0 mb-5 text-[12.5px] leading-[1.55] text-[var(--mm-mid)]">
        All 50 subsystems included — 200 evaluation areas across every system.
      </p>

      <div className="space-y-4">
        {parents.map((p) => {
          const color = SYSTEM_COLORS[p.name] ?? `#${p.color_hex}`;
          const kids = childrenByParent.get(p.id) ?? [];
          return (
            <div key={p.id}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-[13px] font-semibold text-[var(--mm-ink)]">
                  {p.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kids.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                    style={{ background: color, color: "#FFFEFA" }}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-[var(--mm-off-white)] pt-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/health-check" })}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--mm-ember)] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Continue to Health Check <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function AboutMatrixCard() {
  return (
    <section className="rounded-[14px] border border-black/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(24,40,41,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[720px]">
          <h3
            className="m-0 mb-2 text-[18px] text-[var(--mm-ink)]"
            style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
          >
            About the Revenue Health Matrix™
          </h3>
          <p className="m-0 text-[12.5px] leading-[1.6] text-[var(--mm-mid)]">
            The Matrix is a diagnostic model for founder-led revenue —
            5 systems · 10 subsystems each · 4 evaluation areas · 200 total
            checkpoints — designed to surface the structural gaps most operators
            can’t see from the inside.
          </p>
        </div>
        <a
          href="https://marketplacemaven.com/revenue-architecture-framework/"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-[12px] font-medium text-[var(--mm-teal)] hover:underline"
        >
          How the Matrix works →
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[rgba(240,82,35,0.2)] bg-[rgba(240,82,35,0.05)] px-5 py-4">
        <div>
          <div className="text-[13px] font-semibold text-[var(--mm-ink)]">
            Want a guided Diagnostic with a consultant?
          </div>
          <div className="mt-0.5 text-[11.5px] text-[var(--mm-mid)]">
            Book a Revenue Health Diagnostic™ session and get a tailored
            walkthrough of your results.
          </div>
        </div>
        <Link
          to="/diagnostic"
          className="whitespace-nowrap rounded-lg bg-[var(--mm-ember)] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Learn about the Diagnostic →
        </Link>
      </div>
    </section>
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



/* ─────────────────────────  RETURNING USER  ───────────────────────── */

function ReturningView({ data }: { data: DashboardData }) {
  const p = data.profile!;
  const latest = data.latestAssessment!;
  const submittedAt = latest.submitted_at ? new Date(latest.submitted_at) : new Date(latest.created_at!);
  const lastQ = quarterOf(submittedAt);
  const nextQ = nextQuarter(submittedAt);

  const fetchSummary = useServerFn(getExecutiveSummary);
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["report", "executive-summary"],
    queryFn: () => fetchSummary({ data: {} }),
  });

  const SYS_COLOR: Record<string, string> = {
    POS: "var(--mm-sys-positioning)",
    AUTH: "var(--mm-sys-authority)",
    CONV: "var(--mm-sys-conversion)",
    LFC: "var(--mm-sys-lifecycle)",
    VIS: "var(--mm-sys-visibility)",
  };

  const hasSummary = summary && !("error" in summary);
  const systems = hasSummary ? (summary as any).systems as Array<any> : [];
  const overall = hasSummary ? (summary as any).overallScore as number : 0;
  const assessedSystems = systems.filter((s) => s.assessed > 0);
  const weakest = assessedSystems.length
    ? assessedSystems.reduce((a, b) => (a.healthScore <= b.healthScore ? a : b))
    : null;
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
          {systems.map((sys) => {
            const color = SYS_COLOR[sys.code] || "var(--mm-teal-bright)";
            const assessed = sys.assessed > 0;
            const val = assessed ? Math.round(sys.healthScore) : 0;
            return (
              <div key={sys.id}>
                <div className="mb-1 flex justify-between">
                  <span className="text-[11px] font-medium text-white/70">{sys.name}</span>
                  <span className="text-[11px] font-bold" style={{ color: assessed ? color : "rgba(255,255,255,0.4)" }}>
                    {assessed ? val : "—"}
                  </span>
                </div>
                <div className="h-1 rounded-sm bg-white/[0.08]">
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${val}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
          {!hasSummary && !summaryLoading && (
            <div className="col-span-2 text-[11px] text-white/50">
              Complete your Health Check to see your scores.
            </div>
          )}
        </div>
      </section>

      {/* Insight cards */}
      <div className="mb-[22px] grid gap-[18px] md:grid-cols-3">
        {weakest && (
          <InsightCard
            label="Weakest System"
            title={weakest.name}
            value={`${Math.round(weakest.healthScore)} / 100`}
            sub="This system shows the largest gap. Prioritise it in your roadmap."
            color={SYS_COLOR[weakest.code] || "var(--mm-ember)"}
            cta="View System Report"
            href="/reports/revenue-system-health"
          />
        )}

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
