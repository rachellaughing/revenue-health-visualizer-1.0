import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import {
  T,
  RadarChart,
  SideBySideBars,
  SystemCard,
  gapColor,
  gapLabel,
} from "./reports.team-alignment";
import type { AlignmentSystem } from "@/lib/report.functions";

export const Route = createFileRoute("/reports/team-alignment-preview")({
  head: () => ({ meta: [{ title: "Team Alignment (Sample) — Revenue Health Visualiser" }] }),
  component: Page,
});

// Hardcoded illustrative sample — not any real user's data. Same shape the
// real (Diagnostic) report uses, so the components below render identically.
const ILLUSTRATIVE_SYSTEMS: AlignmentSystem[] = [
  {
    code: "POS", name: "Positioning", color: "#3B82F6",
    founderScore: 78, teamAvg: 61, gap: 17, direction: "founder_high", status: "significant_gap",
    clusters: [{ label: "Leadership", score: 74 }, { label: "Sales", score: 58 }, { label: "Marketing", score: 51 }],
    narrative: null,
  },
  {
    code: "AUTH", name: "Authority", color: "#10B981",
    founderScore: 82, teamAvg: 79, gap: 3, direction: "aligned", status: "strong_alignment",
    clusters: [{ label: "Leadership", score: 81 }, { label: "Sales", score: 77 }, { label: "Marketing", score: 80 }],
    narrative: null,
  },
  {
    code: "CONV", name: "Conversion", color: "#F05223",
    founderScore: 55, teamAvg: 74, gap: -19, direction: "team_high", status: "significant_gap",
    clusters: [{ label: "Leadership", score: 60 }, { label: "Sales", score: 79 }, { label: "Marketing", score: 68 }],
    narrative: null,
  },
  {
    code: "LFC", name: "Lifecycle", color: "#8B5CF6",
    founderScore: 71, teamAvg: 44, gap: 27, direction: "founder_high", status: "critical_gap",
    clusters: [{ label: "Leadership", score: 68 }, { label: "Sales", score: 41 }, { label: "Marketing", score: 39 }],
    narrative: null,
  },
  {
    code: "VIS", name: "Visibility", color: "#F59E0B",
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

  return (
    <div style={{ background: T.paper, minHeight: "100dvh", fontFamily: "Inter, sans-serif" }}>
      <IllustrativeDataBanner note="Your real Team Alignment report requires the Revenue Health Diagnostic™." />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE HEALTH MATRIX™ › TEAM ALIGNMENT
        </div>

        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 36, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>
          Team Alignment
        </h1>
        <p style={{ color: T.mid, fontSize: 14, margin: "0 0 28px" }}>Sample Company · Illustrative</p>

        <div
          style={{
            background: T.abyss, borderRadius: 14, padding: "24px 28px", marginBottom: 28,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 8 }}>
              SAMPLE REPORT
            </div>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18, fontWeight: 400, color: T.white, margin: "0 0 6px" }}>
              This is what your Team Alignment report will look like.
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6, maxWidth: 480 }}>
              The Team Alignment Report compares how you see your revenue systems versus how your team sees them. Your team completes the Health Check independently, and consultant observations are added during a Revenue Health Diagnostic™ session.
            </p>
          </div>
          <a
            href="https://marketplacemaven.com"
            target="_blank"
            rel="noreferrer"
            style={{
              background: T.ember, color: T.white, border: "none", borderRadius: 8, padding: "12px 22px",
              whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            Learn about the Diagnostic™
          </a>
        </div>

        <div
          style={{
            background: "rgba(196,149,106,0.08)", border: "1px solid rgba(196,149,106,0.25)", borderRadius: 10,
            padding: "12px 18px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 10,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0, color: T.sand, marginTop: 1 }}>ⓘ</span>
          <div style={{ fontSize: 12, color: T.mid, lineHeight: 1.65 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>About this report: </span>
            Team members complete the Health Check independently. Their scores are anonymised — no individual responses are shown to the founder. Clusters represent functional groups (Leadership, Sales, Marketing), not named individuals.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Overall Alignment", value: `${overallAlignment}%`, color: overallAlignment > 80 ? "#10B981" : overallAlignment > 65 ? "#F59E0B" : T.sand, sub: "Across all systems" },
            { label: "Critical Gaps", value: criticalGaps, color: criticalGaps > 0 ? "#EF4444" : "#10B981", sub: "Require immediate attention" },
            { label: "Leader Sees Stronger", value: leaderHigher, color: T.ember, sub: "Potential blind spots" },
            { label: "Team Sees Stronger", value: teamHigher, color: T.teal, sub: "Hidden organisational strength" },
          ].map((c, i) => (
            <div key={i} style={{ background: T.white, border: "1px solid rgba(0,0,0,0.07)", borderTop: `3px solid ${c.color}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 28, fontFamily: "'Instrument Serif', Georgia, serif", color: c.color, marginBottom: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.mid, letterSpacing: "0.06em", marginBottom: 2 }}>{c.label.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: T.mid }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: T.white, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 28, marginBottom: 28, boxShadow: "0 2px 8px rgba(24,40,41,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 6 }}>SCORE COMPARISON</div>
              <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20, fontWeight: 400, color: T.ink, margin: 0 }}>
                How you see the business vs how your team does.
              </h2>
            </div>
            <div style={{ display: "flex", background: T.offWhite, borderRadius: 8, padding: 3, gap: 2 }}>
              {(["radar", "bars"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: chartView === v ? T.white : "transparent",
                    color: chartView === v ? T.ink : T.mid,
                    fontSize: 11, fontWeight: chartView === v ? 600 : 400,
                    boxShadow: chartView === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {v === "radar" ? "Radar" : "Side by side"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: chartView === "radar" ? "auto 1fr" : "1fr", gap: 32, alignItems: "center" }}>
            {chartView === "radar" ? (
              <>
                <RadarChart data={ILLUSTRATIVE_SYSTEMS} size={280} />
                <div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 24, height: 0, borderTop: `2px dashed ${T.ember}` }} />
                      <span style={{ fontSize: 12, color: T.mid }}>Your scores</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 24, height: 3, background: T.tealBright, borderRadius: 2 }} />
                      <span style={{ fontSize: 12, color: T.mid }}>Team average</span>
                    </div>
                  </div>
                  {ILLUSTRATIVE_SYSTEMS.map((sys) => {
                    const gc = gapColor(sys.status);
                    return (
                      <div key={sys.code} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: sys.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.ink, width: 100 }}>{sys.name}</span>
                        <div style={{ flex: 1, fontSize: 11, color: gc }}>{gapLabel(sys.direction, sys.gap)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <SideBySideBars data={ILLUSTRATIVE_SYSTEMS} />
            )}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 16 }}>
            SYSTEM BY SYSTEM BREAKDOWN
          </div>
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

        <div
          style={{
            background: T.abyss, borderRadius: 12, padding: "24px 28px", display: "flex",
            alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 28,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 6 }}>
              REVENUE HEALTH DIAGNOSTIC™
            </div>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 17, fontWeight: 400, color: T.white, margin: "0 0 4px" }}>
              Get your team's real scores and consultant observations.
            </h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
              The Diagnostic adds per-system consultant observations and sequenced recommendations, built from your team's actual Health Check results.
            </p>
          </div>
          <Link
            to="/diagnostic"
            style={{
              background: T.ember, color: T.white, border: "none", borderRadius: 8, padding: "11px 20px",
              whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}
          >
            Learn about the Diagnostic™
          </Link>
        </div>

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, fontSize: 11, color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
