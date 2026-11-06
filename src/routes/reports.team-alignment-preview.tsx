import { createFileRoute, Link } from "@tanstack/react-router";
import { getSystemColor, getSystemClass } from "@/lib/system-colors";
import { useState } from "react";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import {
  RadarChart,
  SideBySideBars,
  SystemCard,
  gapLabel,
} from "./reports.team-alignment";
import type { AlignmentSystem } from "@/lib/report.functions";

export const Route = createFileRoute("/reports/team-alignment-preview")({
  head: () => ({ meta: [{ title: "Team Alignment (Sample) — Revenue Health Visualizer" }] }),
  component: Page,
});

// Hardcoded illustrative sample — not any real user's data. Same shape the
// real (Diagnostic) report uses, so the components below render identically.
const ILLUSTRATIVE_SYSTEMS: AlignmentSystem[] = [
  {
    code: "POS", name: "Positioning", color: "var(--mm-sys-positioning)",
    founderScore: 78, teamAvg: 61, gap: 17, direction: "founder_high", status: "significant_gap",
    clusters: [{ label: "Leadership", score: 74 }, { label: "Sales", score: 58 }, { label: "Marketing", score: 51 }],
    narrative: null,
  },
  {
    code: "AUTH", name: "Authority", color: "var(--mm-sys-authority)",
    founderScore: 82, teamAvg: 79, gap: 3, direction: "aligned", status: "strong_alignment",
    clusters: [{ label: "Leadership", score: 81 }, { label: "Sales", score: 77 }, { label: "Marketing", score: 80 }],
    narrative: null,
  },
  {
    code: "CONV", name: "Conversion", color: getSystemColor("CONV"),
    founderScore: 55, teamAvg: 74, gap: -19, direction: "team_high", status: "significant_gap",
    clusters: [{ label: "Leadership", score: 60 }, { label: "Sales", score: 79 }, { label: "Marketing", score: 68 }],
    narrative: null,
  },
  {
    code: "LFC", name: "Lifecycle", color: "var(--mm-sys-lifecycle)",
    founderScore: 71, teamAvg: 44, gap: 27, direction: "founder_high", status: "critical_gap",
    clusters: [{ label: "Leadership", score: 68 }, { label: "Sales", score: 41 }, { label: "Marketing", score: 39 }],
    narrative: null,
  },
  {
    code: "VIS", name: "Visibility", color: "var(--mm-sys-visibility)",
    founderScore: 66, teamAvg: 62, gap: 4, direction: "aligned", status: "strong_alignment",
    clusters: [{ label: "Leadership", score: 64 }, { label: "Sales", score: 60 }, { label: "Marketing", score: 65 }],
    narrative: null,
  },
];

const overallAlignment = Math.round(
  ILLUSTRATIVE_SYSTEMS.reduce((s, d) => s + (100 - Math.abs(d.gap)), 0) / ILLUSTRATIVE_SYSTEMS.length,
);
const criticalGaps = ILLUSTRATIVE_SYSTEMS.filter((d) => d.status === "critical_gap").length;
const leaderHigher = ILLUSTRATIVE_SYSTEMS.filter((d) => d.direction === "founder_high" && d.status !== "strong_alignment").length;
const teamHigher = ILLUSTRATIVE_SYSTEMS.filter((d) => d.direction === "team_high" && d.status !== "strong_alignment").length;

function Page() {
  const [chartView, setChartView] = useState<"radar" | "bars">("radar");
  const [expandedSystem, setExpandedSystem] = useState<string | null>("LFC");

  const overallTone = overallAlignment > 80 ? "success" : overallAlignment > 65 ? "warning" : "error";
  const STATS = [
    { label: "Overall Alignment", value: `${overallAlignment}%`, tone: overallTone, sub: "Across all systems" },
    { label: "Critical Gaps", value: criticalGaps, tone: criticalGaps > 0 ? "error" : "success", sub: "Require immediate attention" },
    { label: "Leader Sees Stronger", value: leaderHigher, tone: "eyebrow", sub: "Potential blind spots" },
    { label: "Team Sees Stronger", value: teamHigher, tone: "link", sub: "Hidden organizational strength" },
  ];

  return (
    <div className="mm-page-bg">
      <IllustrativeDataBanner note="Your real Team Alignment report requires the Revenue Health Diagnostic™." />
      <main className="mm-page mm-page--wide">
        <div className="mm-breadcrumb">REVENUE HEALTH MATRIX™ › TEAM ALIGNMENT</div>

        <h1 className="mm-report-title mm-report-title--lg">Team Alignment</h1>
        <p className="text-sm mm-muted mm-mb-xl">Sample Company · Illustrative</p>

        <div className="mm-cta-band mm-cta-band--lg mm-mb-xl">
          <div>
            <div className="mm-cta-band__kicker">SAMPLE REPORT</div>
            <h3 className="mm-cta-band__title">This is what your Team Alignment report will look like.</h3>
            <p className="mm-cta-band__body">
              The Team Alignment Report compares how you see your revenue systems versus how your team sees them. Your team completes the Health Check independently, and consultant observations are added during a Revenue Health Diagnostic™ session.
            </p>
          </div>
          <a href="https://marketplacemaven.com" target="_blank" rel="noreferrer" className="mm-cta-band__btn">
            Learn about the Diagnostic™
          </a>
        </div>

        <div className="mm-callout-info mm-callout--row mm-mb-xl">
          <span aria-hidden className="text-sm text-[var(--mm-link)]">ⓘ</span>
          <div className="text-xs leading-[1.65] mm-muted">
            <span className="font-semibold mm-text">About this report: </span>
            Team members complete the Health Check independently. Their scores are anonymized — no individual responses are shown to the founder. Clusters represent functional groups (Leadership, Sales, Marketing), not named individuals.
          </div>
        </div>

        <div className="mm-grid mm-grid--4 mm-gap-md mm-mb-xl">
          {STATS.map((c) => (
            <div key={c.label} className={`mm-stat mm-tone--${c.tone}`}>
              <div className="mm-stat__n">{c.value}</div>
              <div className="mm-stat__l">{c.label}</div>
              <div className="mm-stat__s">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="mm-report-card mm-mb-xl">
          <div className="mm-row mm-row--between mm-mb-lg">
            <div>
              <div className="mm-kicker mm-mb-xs">SCORE COMPARISON</div>
              <h2 className="mm-report-h2 m-0">How you see the business vs how your team does.</h2>
            </div>
            <div className="mm-seg mm-seg--sm" role="tablist">
              {(["radar", "bars"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={chartView === v}
                  onClick={() => setChartView(v)}
                  className={`mm-seg__btn ${chartView === v ? "mm-seg__btn--on" : ""}`}
                >
                  {v === "radar" ? "Radar" : "Side by side"}
                </button>
              ))}
            </div>
          </div>

          <div className={`mm-ta-chart ${chartView === "radar" ? "mm-ta-chart--radar" : ""}`}>
            {chartView === "radar" ? (
              <>
                <RadarChart data={ILLUSTRATIVE_SYSTEMS} size={280} />
                <div>
                  <div className="mm-row mm-gap-lg mm-mb-lg">
                    <div className="mm-row mm-gap-xs">
                      <div className="mm-legend-dash" />
                      <span className="text-xs mm-muted">Your scores</span>
                    </div>
                    <div className="mm-row mm-gap-xs">
                      <div className="mm-legend-line" />
                      <span className="text-xs mm-muted">Team average</span>
                    </div>
                  </div>
                  {ILLUSTRATIVE_SYSTEMS.map((sys) => (
                    <div key={sys.code} className={`mm-row mm-gap-sm mm-mb-xs ${getSystemClass(sys.code)} mm-tone--${GAP_TONE[sys.status]}`}>
                      <span className="mm-sys-dot mm-dot-8" />
                      <span className="mm-ta-sysname">{sys.name}</span>
                      <div className="mm-flex-1 text-[11px] mm-accent-text">{gapLabel(sys.direction, sys.gap)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <SideBySideBars data={ILLUSTRATIVE_SYSTEMS} />
            )}
          </div>
        </div>

        <div className="mm-mb-xl">
          <div className="mm-kicker mm-mb-md">SYSTEM BY SYSTEM BREAKDOWN</div>
          <div>
            {ILLUSTRATIVE_SYSTEMS.map((sys) => (
              <SystemCard
                key={sys.code}
                d={sys}
                expanded={expandedSystem === sys.code}
                onToggle={() => setExpandedSystem(expandedSystem === sys.code ? null : sys.code)}
                isDiagnostic={false}
              />
            ))}
          </div>
        </div>

        <div className="mm-cta-band mm-cta-band--lg mm-mb-xl">
          <div>
            <div className="mm-cta-band__kicker">REVENUE HEALTH DIAGNOSTIC™</div>
            <h3 className="mm-cta-band__title">Get your team's real scores and consultant observations.</h3>
            <p className="mm-cta-band__body">
              The Diagnostic adds per-system consultant observations and sequenced recommendations, built from your team's actual Health Check results.
            </p>
          </div>
          <Link to="/diagnostic" className="mm-cta-band__btn">
            Learn about the Diagnostic™
          </Link>
        </div>

        <div className="mm-footer">© 2025 Marketplace Maven. All rights reserved.</div>
      </main>
    </div>
  );
}

const GAP_TONE: Record<AlignmentSystem["status"], "error" | "warning" | "success"> = {
  critical_gap: "error",
  significant_gap: "warning",
  moderate_gap: "warning",
  strong_alignment: "success",
};
