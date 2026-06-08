import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getTeamAlignment, type TeamAlignmentData, type AlignmentSystem } from "@/lib/report.functions";

export const Route = createFileRoute("/reports/team-alignment")({
  head: () => ({ meta: [{ title: "Team Alignment — Revenue Health Visualiser" }] }),
  component: Page,
});

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  teal: "#2A6B6E",
  tealMid: "#3D8C8F",
  tealBright: "#4ABFC4",
  sand: "#C4956A",
  mid: "#888880",
  ink: "#111111",
  white: "#FFFFFF",
};

function gapColor(status: AlignmentSystem["status"]): string {
  if (status === "critical_gap") return "#EF4444";
  if (status === "significant_gap") return T.sand;
  if (status === "moderate_gap") return "#F59E0B";
  return "#10B981";
}

function statusLabel(status: AlignmentSystem["status"]): string {
  if (status === "critical_gap") return "Critical Gap";
  if (status === "significant_gap") return "Significant Gap";
  if (status === "moderate_gap") return "Moderate Gap";
  return "Aligned";
}

function gapLabel(direction: AlignmentSystem["direction"], gap: number): string {
  const abs = Math.abs(gap);
  if (direction === "aligned") return "Consistent perception";
  if (direction === "founder_high") return `Leadership sees this ${abs} pts stronger than the team`;
  return `Team sees this ${abs} pts stronger than leadership`;
}

function gapInterpretation(d: AlignmentSystem): string {
  const abs = Math.abs(d.gap);
  if (d.direction === "aligned") {
    return `You and your team see ${d.name} consistently. This shared perception is a foundation to build on.`;
  }
  if (d.direction === "founder_high") {
    return `You score ${d.name} ${abs} points higher than your team. This may reflect leadership context the team lacks — or a blind spot worth examining.`;
  }
  return `Your team scores ${d.name} ${abs} points higher than you do. You may be seeing problems your team is not yet aware of — or underestimating a genuine organisational strength.`;
}

// ---------- Radar Chart ----------
function RadarChart({ data, size = 280 }: { data: AlignmentSystem[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = data.length;
  const points = data.map((_, i) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });

  const scoreToPoint = (score: number, idx: number) => {
    const { x, y } = points[idx];
    const scaled = (score / 100) * r;
    return { x: cx + x * scaled, y: cy + y * scaled };
  };

  const makePolygon = (scores: number[]) =>
    scores.map((s, i) => {
      const p = scoreToPoint(s, i);
      return `${p.x},${p.y}`;
    }).join(" ");

  const founderPoly = makePolygon(data.map((d) => d.founderScore));
  const teamPoly = makePolygon(data.map((d) => d.teamAvg));
  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size}>
      {rings.map((ring) => (
        <polygon key={ring} points={makePolygon(Array(n).fill(ring))} fill="none" stroke={T.offWhite} strokeWidth={1} />
      ))}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + p.x * r} y2={cy + p.y * r} stroke={T.offWhite} strokeWidth={1} />
      ))}
      <polygon points={teamPoly} fill={T.tealBright + "40"} stroke={T.tealBright} strokeWidth={2} strokeLinejoin="round" />
      <polygon points={founderPoly} fill="none" stroke={T.ember} strokeWidth={2} strokeLinejoin="round" strokeDasharray="5,3" />
      {data.map((d, i) => {
        const labelR = r + 22;
        const lx = cx + points[i].x * labelR;
        const ly = cy + points[i].y * labelR;
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill={d.color}>
            {d.name}
          </text>
        );
      })}
      {data.map((d, i) => {
        const fp = scoreToPoint(d.founderScore, i);
        const tp = scoreToPoint(d.teamAvg, i);
        return (
          <g key={i}>
            <circle cx={fp.x} cy={fp.y} r={4} fill={T.ember} />
            <circle cx={tp.x} cy={tp.y} r={4} fill={T.tealBright} />
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Side by Side Bars ----------
function SideBySideBars({ data }: { data: AlignmentSystem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {data.map((d) => {
        const gc = gapColor(d.status);
        return (
          <div key={d.code}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 11, color: gc, fontWeight: 600 }}>
                {statusLabel(d.status)} ({d.gap > 0 ? "+" : ""}{d.gap} pts)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: T.ember, width: 56, fontWeight: 600 }}>You</span>
              <div style={{ flex: 1, height: 8, background: T.offWhite, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.founderScore}%`, background: T.ember, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ember, width: 28, textAlign: "right" }}>{d.founderScore}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: T.tealBright, width: 56, fontWeight: 600 }}>Team avg</span>
              <div style={{ flex: 1, height: 8, background: T.offWhite, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.teamAvg}%`, background: T.tealBright, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.tealBright, width: 28, textAlign: "right" }}>{d.teamAvg}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- System Card ----------
function SystemCard({
  d,
  expanded,
  onToggle,
  isDiagnostic,
}: {
  d: AlignmentSystem;
  expanded: boolean;
  onToggle: () => void;
  isDiagnostic: boolean;
}) {
  const gc = gapColor(d.status);
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${expanded ? d.color + "40" : "rgba(0,0,0,0.07)"}`,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        boxShadow: expanded ? `0 4px 16px ${d.color}12` : "0 2px 6px rgba(24,40,41,0.04)",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          background: expanded ? d.color + "06" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          borderBottom: expanded ? `1px solid ${T.offWhite}` : "none",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{d.name}</span>
        <div style={{ padding: "3px 10px", borderRadius: 20, background: gc + "18", color: gc, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
          {statusLabel(d.status)}
        </div>
        <div style={{ textAlign: "right", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: gc, fontWeight: 600, lineHeight: 1.3 }}>{gapLabel(d.direction, d.gap)}</div>
        </div>
        <span style={{ fontSize: 12, color: T.mid, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>⌄</span>
      </button>

      {expanded && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Your Score", value: String(d.founderScore), color: T.ember },
              { label: "Team Average", value: String(d.teamAvg), color: T.tealBright },
              { label: "Gap", value: `${d.gap > 0 ? "+" : ""}${d.gap}`, color: gc },
            ].map((it, i) => (
              <div key={i} style={{ background: T.offWhite, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontFamily: "'Instrument Serif', Georgia, serif", color: it.color, marginBottom: 3 }}>{it.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.08em" }}>{it.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 10 }}>BY CLUSTER</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {d.clusters.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.ink, width: 100, flexShrink: 0 }}>{c.label}</span>
                  <div style={{ flex: 1, height: 6, background: T.offWhite, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.score}%`, background: d.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.color, width: 28, textAlign: "right" }}>{c.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: gc + "0A", border: `1px solid ${gc}25`, borderRadius: 10, padding: "14px 16px", marginBottom: isDiagnostic && d.narrative ? 20 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: gc, letterSpacing: "0.1em", marginBottom: 6 }}>WHAT THIS MEANS</div>
            <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.65, margin: 0 }}>{gapInterpretation(d)}</p>
          </div>

          {isDiagnostic && d.narrative && (
            <div style={{ borderLeft: `3px solid ${T.teal}`, background: T.abyss + "06", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.teal, letterSpacing: "0.1em", marginBottom: 8 }}>CONSULTANT OBSERVATION</div>
              <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.75, margin: 0 }}>{d.narrative}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Page() {
  const fetchData = useServerFn(getTeamAlignment);
  const { data, isLoading, error } = useQuery({
    queryKey: ["team-alignment"],
    queryFn: () => fetchData({ data: {} }),
  });

  const [chartView, setChartView] = useState<"radar" | "bars">("radar");
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);

  if (isLoading) {
    return <div style={{ padding: 40, color: T.mid }}>Loading…</div>;
  }
  if (error || !data) {
    return <div style={{ padding: 40, color: T.mid }}>Unable to load the report.</div>;
  }
  if ("error" in data) {
    return (
      <div style={{ padding: 40 }}>
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: T.ink }}>No completed Health Check yet</h1>
        <p style={{ color: T.mid }}>Complete your Health Check to unlock the Team Alignment report.</p>
      </div>
    );
  }

  const d = data as TeamAlignmentData;
  const isStarter = d.tier === "starter";
  const isDiagnostic = d.tier === "diagnostic";
  const submitted = d.assessment?.submitted_at
    ? new Date(d.assessment.submitted_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  // Waiting state — only render this
  if (d.state === "waiting") {
    return (
      <div style={{ background: T.paper, minHeight: "100dvh", fontFamily: "Inter, sans-serif" }}>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 40px" }}>
          <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
            REVENUE HEALTH MATRIX™ › TEAM ALIGNMENT
          </div>
          <div style={{ background: T.white, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "0 2px 8px rgba(24,40,41,0.05)" }}>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, color: T.ink, margin: "0 0 12px" }}>Waiting for your team</h1>
            <p style={{ color: T.mid, fontSize: 14, lineHeight: 1.65, margin: "0 0 24px" }}>
              Your team members haven&apos;t completed the Health Check yet ({d.completedCount}/{d.invitedCount} complete).
              Share the link below to get started.
            </p>
            {d.teamInviteUrl && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <input
                  readOnly
                  value={d.teamInviteUrl}
                  style={{ flex: 1, maxWidth: 380, padding: "10px 14px", border: `1px solid ${T.offWhite}`, borderRadius: 8, fontSize: 12, color: T.ink, background: T.offWhite }}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(d.teamInviteUrl!)}
                  style={{ background: T.ember, color: T.white, border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const blurStyle: React.CSSProperties = isStarter
    ? { filter: "blur(3px)", userSelect: "none", pointerEvents: "none" }
    : {};

  return (
    <div style={{ background: T.paper, minHeight: "100dvh", fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 40px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE HEALTH MATRIX™ › TEAM ALIGNMENT
        </div>

        {/* H1 */}
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 36, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>
          Team Alignment
        </h1>
        <p style={{ color: T.mid, fontSize: 14, margin: "0 0 28px" }}>
          {d.company.company_name ?? ""}
          {submitted ? ` · ${submitted}` : ""}
        </p>

        {/* Tier banner */}
        {!isDiagnostic && (
          <div
            style={{
              background: T.abyss,
              borderRadius: 14,
              padding: "24px 28px",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 8 }}>
                {isStarter ? "REVENUE HEALTH SNAPSHOT™" : "REVENUE HEALTH ASSESSMENT™"}
              </div>
              <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18, fontWeight: 400, color: T.white, margin: "0 0 6px" }}>
                {isStarter
                  ? "This is a preview of the Team Alignment Report."
                  : "Your Team Alignment Report shows real scores — consultant observations unlock with the Diagnostic."}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6, maxWidth: 480 }}>
                {isStarter
                  ? "The Team Alignment Report compares how you see your revenue systems versus how your team sees them. It requires team members to complete the Health Check — available in Revenue Health Assessment™ and above."
                  : "You can see how your scores compare to your team. The Revenue Health Diagnostic™ adds consultant observations and prioritised focus recommendations."}
              </p>
            </div>
            <button
              style={{
                background: T.ember,
                color: T.white,
                border: "none",
                borderRadius: 8,
                padding: "12px 22px",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isStarter ? "Upgrade to Assessment™" : "Learn about the Diagnostic™"}
            </button>
          </div>
        )}

        {/* Anonymity callout */}
        <div
          style={{
            background: "rgba(196,149,106,0.08)",
            border: "1px solid rgba(196,149,106,0.25)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0, color: T.sand, marginTop: 1 }}>ⓘ</span>
          <div style={{ fontSize: 12, color: T.mid, lineHeight: 1.65 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>About this report: </span>
            Team members completed the Health Check independently. Their scores are anonymised — no individual responses are shown to the founder. Clusters represent functional groups (Leadership, Sales, Marketing) not named individuals.
          </div>
        </div>

        <div style={blurStyle}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              {
                label: "Overall Alignment",
                value: `${d.summary.overallAlignment}%`,
                color: d.summary.overallAlignment > 80 ? "#10B981" : d.summary.overallAlignment > 65 ? "#F59E0B" : T.sand,
                sub: "Across all systems",
              },
              {
                label: "Critical Gaps",
                value: d.summary.criticalGaps,
                color: d.summary.criticalGaps > 0 ? "#EF4444" : "#10B981",
                sub: "Require immediate attention",
              },
              { label: "Leader Sees Stronger", value: d.summary.leaderHigher, color: T.ember, sub: "Potential blind spots" },
              { label: "Team Sees Stronger", value: d.summary.teamHigher, color: T.teal, sub: "Hidden organisational strength" },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  background: T.white,
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderTop: `3px solid ${c.color}`,
                  borderRadius: 10,
                  padding: "16px 18px",
                }}
              >
                <div style={{ fontSize: 28, fontFamily: "'Instrument Serif', Georgia, serif", color: c.color, marginBottom: 4 }}>{c.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.mid, letterSpacing: "0.06em", marginBottom: 2 }}>
                  {c.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: T.mid }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart card */}
          <div
            style={{
              background: T.white,
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 14,
              padding: 28,
              marginBottom: 28,
              boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
            }}
          >
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
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: chartView === v ? T.white : "transparent",
                      color: chartView === v ? T.ink : T.mid,
                      fontSize: 11,
                      fontWeight: chartView === v ? 600 : 400,
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
                  <RadarChart data={d.systems} size={280} />
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
                    {d.systems.map((sys) => {
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
                <SideBySideBars data={d.systems} />
              )}
            </div>
          </div>

          {/* System breakdown */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 16 }}>
              SYSTEM BY SYSTEM BREAKDOWN
            </div>
            <div>
              {d.systems.map((sys) => (
                <SystemCard
                  key={sys.code}
                  d={sys}
                  expanded={expandedSystem === sys.code}
                  onToggle={() => setExpandedSystem(expandedSystem === sys.code ? null : sys.code)}
                  isDiagnostic={isDiagnostic}
                />
              ))}
            </div>
          </div>

          {/* Diagnostic recommendations */}
          {isDiagnostic && d.recommendations.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 16 }}>
                CONSULTANT RECOMMENDATIONS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {d.recommendations.map((rec) => (
                  <div
                    key={rec.rank}
                    style={{
                      background: T.white,
                      border: "1px solid rgba(0,0,0,0.07)",
                      borderLeft: `3px solid ${rec.systemColor}`,
                      borderRadius: 10,
                      padding: "18px 20px",
                      display: "grid",
                      gridTemplateColumns: "32px 1fr auto",
                      gap: 16,
                      alignItems: "flex-start",
                      boxShadow: "0 2px 6px rgba(24,40,41,0.04)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: rec.systemColor + "18",
                        border: `1.5px solid ${rec.systemColor}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: rec.systemColor,
                        flexShrink: 0,
                      }}
                    >
                      {rec.rank}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{rec.title}</div>
                      <p style={{ fontSize: 12, color: T.mid, lineHeight: 1.65, margin: 0 }}>{rec.rationale}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, textAlign: "right" }}>
                      {rec.effortLevel && (
                        <div style={{ padding: "2px 10px", borderRadius: 20, background: T.offWhite, color: T.mid, fontSize: 10, fontWeight: 600 }}>
                          {rec.effortLevel} effort
                        </div>
                      )}
                      {rec.timeframe && <div style={{ fontSize: 11, color: T.mid }}>{rec.timeframe}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-diagnostic upsell */}
          {!isDiagnostic && !isStarter && (
            <div
              style={{
                background: T.abyss,
                borderRadius: 12,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                marginBottom: 28,
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 6 }}>
                  REVENUE HEALTH DIAGNOSTIC™
                </div>
                <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 17, fontWeight: 400, color: T.white, margin: "0 0 4px" }}>
                  Get consultant observations and prioritised focus areas.
                </h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  The Diagnostic adds per-system consultant observations and sequenced recommendations.
                </p>
              </div>
              <button
                style={{
                  background: T.ember,
                  color: T.white,
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 20px",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Learn about the Diagnostic™
              </button>
            </div>
          )}
        </div>

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, fontSize: 11, color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
