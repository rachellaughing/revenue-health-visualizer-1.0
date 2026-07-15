import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  getExecutiveSummary,
  generateReportNarrative,
  type ExecutiveSummary,
  type ParentScore,
} from "@/lib/report.functions";


export const Route = createFileRoute("/reports/executive-summary")({
  head: () => ({ meta: [{ title: "Executive Summary — Revenue Health Visualiser" }] }),
  component: ExecSummaryPage,
});

// ── Tokens (prototype-verbatim) ─────────────────────────────────────────────
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
  danger: "#EF4444",
  sys: {
    POS: "#3B82F6",
    AUTH: "#10B981",
    CONV: "#F05223",
    LFC: "#8B5CF6",
    VIS: "#F59E0B",
  } as Record<string, string>,
};

// Deterministic illustrative scores per parent code (for blurred rows)
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function illustrativeForParent(seed: string, code: string) {
  const h = hash(`${seed}:${code}`);
  const healthScore = 40 + (h % 45); // 40-84
  const trackingScore = Math.max(15, healthScore - 10 - ((h >> 8) % 25));
  return { healthScore, trackingScore };
}

function severityColor(s: string) {
  if (s === "critical") return T.danger;
  if (s === "fragile") return T.sand;
  if (s === "stable") return T.sys.AUTH;
  if (s === "strong") return T.sys.AUTH;
  return T.mid;
}
function severityBg(s: string) {
  if (s === "critical") return "rgba(239,68,68,0.1)";
  if (s === "fragile") return "rgba(196,149,106,0.12)";
  if (s === "stable") return "rgba(16,185,129,0.1)";
  if (s === "strong") return "rgba(16,185,129,0.12)";
  if (s === "not_assessed") return "rgba(136,136,128,0.10)";
  return T.offWhite;
}
function severityLabelText(s: string) {
  if (s === "not_assessed") return "Not assessed";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Reusable bits ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: "Inter",
        fontWeight: 700,
        color: T.mid,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Card({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: T.white,
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ScoreRing({
  score,
  size = 100,
  color,
}: {
  score: number;
  size?: number;
  color: string;
}) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.offWhite} strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={T.ink}
        fontSize={size * 0.26}
        fontFamily="Inter"
        fontWeight={700}
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
      >
        {score}
      </text>
    </svg>
  );
}

function Skeleton({
  width = "100%",
  height = 12,
  style = {},
}: {
  width?: number | string;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: `linear-gradient(90deg, ${T.offWhite} 0%, #ECECE6 50%, ${T.offWhite} 100%)`,
        backgroundSize: "200% 100%",
        animation: "rhvShimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

function BlindspotCallout() {
  return (
    <div
      style={{
        background: `rgba(196,149,106,0.08)`,
        border: `1px solid rgba(196,149,106,0.3)`,
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 28,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🔍</span>
      <div>
        <span style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 500, color: T.ink }}>
          This is a self-assessment.{" "}
        </span>
        <span style={{ fontSize: 13, fontFamily: "Inter", color: T.mid, lineHeight: 1.6 }}>
          Self-reported scores reflect your current perception of each system. Every founder has blind spots — areas where confidence is high but the underlying system is more fragile than it appears.{" "}
        </span>
        <a
          href="https://marketplacemaven.com/founder-blindspots"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, fontFamily: "Inter", color: T.teal, fontWeight: 500 }}
        >
          Read about founder blind spots →
        </a>
      </div>
    </div>
  );
}

// ─── Operating conditions derivation ────────────────────────────────────────
type OpCond = {
  label: string;
  value: string;
  status: "danger" | "warning" | "success";
  description: string;
};

function buildOperatingConditions(
  systems: ParentScore[],
  overallScore: number,
): OpCond[] {
  const lfc = systems.find((s) => s.code === "LFC");
  const vis = systems.find((s) => s.code === "VIS");
  const tracked = systems.filter((s) => s.trackingScore > 0);
  const avgTracking = tracked.length
    ? tracked.reduce((a, b) => a + b.trackingScore, 0) / tracked.length
    : 0;
  const avgGap = systems.length
    ? systems.reduce((a, b) => a + b.visibilityGap, 0) / systems.length
    : 0;

  const leakageStatus =
    !lfc || lfc.healthScore < 50 ? "danger" : lfc.healthScore < 70 ? "warning" : "success";
  const leakageValue =
    leakageStatus === "danger" ? "High" : leakageStatus === "warning" ? "Moderate" : "Low";

  const stabilityStatus =
    avgTracking < 40 ? "danger" : avgTracking < 60 ? "warning" : "success";
  const stabilityValue =
    stabilityStatus === "danger"
      ? "Critical"
      : stabilityStatus === "warning"
        ? "Fragile"
        : "Stable";

  const visPct = Math.round(vis?.trackingScore ?? avgTracking);
  const visStatus = visPct < 40 ? "danger" : visPct < 60 ? "warning" : "success";

  const scaleAdj = overallScore - avgGap * 0.3;
  const scaleStatus = scaleAdj < 45 ? "danger" : scaleAdj < 65 ? "warning" : "success";
  const scaleValue =
    scaleStatus === "danger" ? "Not Ready" : scaleStatus === "warning" ? "At Risk" : "Ready";

  return [
    {
      label: "Revenue Leakage",
      value: leakageValue,
      status: leakageStatus,
      description:
        leakageStatus === "danger"
          ? "Lifecycle gaps are driving churn and lost expansion revenue."
          : leakageStatus === "warning"
            ? "Lifecycle gaps are creating downstream churn and expansion revenue loss."
            : "Lifecycle systems are containing churn and protecting expansion revenue.",
    },
    {
      label: "Operational Stability",
      value: stabilityValue,
      status: stabilityStatus,
      description:
        stabilityStatus === "success"
          ? "Most systems are documented and consistently measured."
          : "Key systems run on informal knowledge rather than documented process.",
    },
    {
      label: "Visibility Confidence",
      value: `${visPct}%`,
      status: visStatus,
      description:
        visStatus === "success"
          ? "Tracking signals are strong and decisions are evidence-based."
          : "Tracking scores indicate most capabilities are undocumented or inconsistently measured.",
    },
    {
      label: "Scale Readiness",
      value: scaleValue,
      status: scaleStatus,
      description:
        scaleStatus === "success"
          ? "Current systems can absorb the next stage of growth without structural strain."
          : scaleStatus === "warning"
            ? "Current systems will create friction at the next revenue stage without structural changes."
            : "Current systems will block the next stage of growth without structural intervention.",
    },
  ];
}

// ─── Page ──────────────────────────────────────────────────────────────────

function ExecSummaryPage() {
  const fetchSummary = useServerFn(getExecutiveSummary);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", "executive-summary"],
    queryFn: () => fetchSummary({ data: {} }),
  });

  const shellStyles: React.CSSProperties = {
    minHeight: "100dvh",
    background: T.paper,
    fontFamily: "Inter, sans-serif",
  };

  if (isLoading) {
    return (
      <div style={shellStyles}>
        <GlobalStyles />
        <TopBar />
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 40px 80px" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={shellStyles}>
        <GlobalStyles />
        <TopBar />
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 40px 80px" }}>
          <Card>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22, color: T.ink, margin: 0 }}>
              We couldn't load your report.
            </h2>
            <p style={{ fontSize: 13, color: T.mid, marginTop: 8 }}>{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: 14,
                background: T.ember,
                color: T.white,
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "Inter",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </Card>
        </main>
      </div>
    );
  }

  if (!data) return null;

  if ("error" in data && data.error === "no_completed_assessment") {
    return (
      <div style={shellStyles}>
        <GlobalStyles />
        <TopBar />
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 40px 80px" }}>
          <Card>
            <SectionLabel>No completed Health Check yet</SectionLabel>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, color: T.ink, margin: "0 0 10px" }}>
              Your Executive Summary unlocks once you finish your Health Check.
            </h2>
            <p style={{ fontSize: 13, color: T.mid, lineHeight: 1.6, margin: "0 0 16px" }}>
              Complete every subsystem in your tier to generate this report.
            </p>
            <Link
              to="/health-check"
              style={{
                background: T.ember,
                color: T.white,
                borderRadius: 8,
                padding: "10px 18px",
                fontFamily: "Inter",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-block",
              }}
            >
              Go to your Health Check →
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return <ReportBody summary={data as ExecutiveSummary} onNarrativeReady={() => refetch()} />;
}


function TopBar() {
  return (
    <div
      style={{
        height: 52,
        background: T.paper,
        borderBottom: `1px solid ${T.offWhite}`,
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link to="/dashboard" style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
          Reports
        </Link>
        <span style={{ fontSize: 12, color: T.mid }}>›</span>
        <span style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: T.ink }}>
          Executive Summary
        </span>
      </div>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
      a { text-decoration: none; }
      a:hover { text-decoration: underline; }
      @keyframes rhvShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}

function ReportBody({
  summary,
  onNarrativeReady,
}: {
  summary: ExecutiveSummary;
  onNarrativeReady: () => void;
}) {
  const { tier, profile, company, assessment, systems, overallScore, narrative, quarter } = summary;
  const isStarter = tier === "starter";

  const generate = useServerFn(generateReportNarrative);
  const triggered = useRef(false);
  useEffect(() => {
    if (!narrative && !triggered.current) {
      triggered.current = true;
      generate({ data: { assessmentId: assessment.id } })
        .then(() => onNarrativeReady())
        .catch((e) => console.error("[narrative] generation failed", e));
    }
  }, [narrative, assessment.id, generate, onNarrativeReady]);



  // Determine which systems get blurred for starter
  // Pick first N systems user has actual data for; others get illustrative
  const visibleSystems = systems.map((s) => {
    const illustrative = isStarter && s.assessed === 0;
    if (illustrative) {
      const i = illustrativeForParent(assessment.id, s.code);
      return {
        ...s,
        healthScore: i.healthScore,
        trackingScore: i.trackingScore,
        severity:
          i.healthScore < 40
            ? "critical"
            : i.healthScore < 60
              ? "fragile"
              : i.healthScore < 75
                ? "stable"
                : "strong",
        illustrative: true as const,
      };
    }
    return { ...s, illustrative: false as const };
  });

  const realScores = visibleSystems.filter((s) => !s.illustrative && s.severity !== "not_assessed").map((s) => s.healthScore);
  const realCount = realScores.length;
  const minReal = realScores.length ? Math.min(...realScores) : 0;
  const maxReal = realScores.length ? Math.max(...realScores) : 0;

  const opConditions = buildOperatingConditions(systems, overallScore);
  const companyName = company.company_name ?? profile.business_name ?? "Your company";
  const companyMeta = [companyName, company.annual_revenue, company.funding_stage, quarter]
    .filter(Boolean)
    .join(" · ");

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <GlobalStyles />
      <TopBar />

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 40px 80px" }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontSize: 11,
            fontFamily: "Inter",
            color: T.mid,
            marginBottom: 28,
            letterSpacing: "0.08em",
          }}
        >
          REVENUE HEALTH MATRIX™ &nbsp;›&nbsp; EXECUTIVE SUMMARY &nbsp;›&nbsp; {quarter.toUpperCase()}
        </div>

        <BlindspotCallout />

        {/* Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, marginBottom: 32 }}>
          <Card>
            <SectionLabel>Operational Intelligence</SectionLabel>
            {narrative ? (
              <>
                <h1
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 28,
                    fontWeight: 400,
                    color: T.ink,
                    lineHeight: 1.25,
                    margin: "0 0 14px",
                  }}
                >
                  {narrative.headline}
                </h1>
                <p
                  style={{
                    fontFamily: "Inter",
                    fontSize: 14,
                    color: T.mid,
                    lineHeight: 1.75,
                    margin: "0 0 20px",
                  }}
                >
                  {narrative.body}
                </p>
              </>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    height: 12,
                    background: "#EDEDE8",
                    borderRadius: 4,
                    marginBottom: 10,
                    width: "92%",
                  }}
                />
                <div
                  style={{
                    height: 12,
                    background: "#EDEDE8",
                    borderRadius: 4,
                    width: "78%",
                  }}
                />
              </div>
            )}

            <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>
              <span style={{ fontWeight: 600, color: T.ink }}>{companyMeta}</span>
            </div>
            {isStarter && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  background: "rgba(240,82,35,0.06)",
                  border: "1px solid rgba(240,82,35,0.15)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "Inter",
                  color: T.ember,
                }}
              >
                This summary is based on 3 of 10 subsystems per system. Upgrade to Revenue Health Assessment™ for a complete picture.
              </div>
            )}
          </Card>

          <Card
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <SectionLabel>Revenue Health Score</SectionLabel>
            <ScoreRing
              score={overallScore}
              size={100}
              color={overallScore >= 70 ? T.sys.AUTH : overallScore >= 50 ? T.sand : T.danger}
            />
            <div
              style={{
                fontSize: 12,
                fontFamily: "Inter",
                color: T.mid,
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              Composite of {realCount} system score{realCount === 1 ? "" : "s"}, weighted by health and tracking confidence.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                {
                  label:
                    overallScore >= 70 ? "Stable" : overallScore >= 50 ? "Fragile" : "Critical",
                  color:
                    overallScore >= 70 ? T.sys.AUTH : overallScore >= 50 ? T.sand : T.danger,
                },
                { label: "Self-Assessment", color: T.mid },
              ].map((b, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: b.color + "18",
                    color: b.color,
                    border: `1px solid ${b.color}30`,
                  }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Operating Conditions */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Operating Conditions</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {opConditions.map((c, i) => {
              const accent =
                c.status === "danger" ? T.danger : c.status === "warning" ? T.sand : T.sys.AUTH;
              return (
                <Card key={i} style={{ padding: 18, borderTop: `3px solid ${accent}` }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: T.mid,
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    {c.label.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      color: accent,
                      marginBottom: 8,
                    }}
                  >
                    {c.value}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      fontFamily: "Inter",
                      color: T.mid,
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {c.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Health Table */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <SectionLabel>Subsystem Health</SectionLabel>
              <h2
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: 22,
                  fontWeight: 400,
                  color: T.ink,
                  margin: 0,
                }}
              >
                System scores at a glance.
              </h2>
            </div>
            <p
              style={{
                fontSize: 11,
                fontFamily: "Inter",
                color: T.mid,
                textAlign: "right",
                maxWidth: 220,
                lineHeight: 1.5,
              }}
            >
              Each system reports a health score (0–100) and a tracking confidence score.
            </p>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 100px 160px 100px",
                padding: "12px 24px",
                borderBottom: `1px solid ${T.offWhite}`,
                background: T.offWhite,
              }}
            >
              {["System", "Score", "Status", "Signal Strength", "Confidence"].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: T.mid,
                    letterSpacing: "0.08em",
                  }}
                >
                  {h.toUpperCase()}
                </div>
              ))}
            </div>

            {visibleSystems.map((sys, i) => {
              const sysColor = T.sys[sys.code] ?? sys.color_hex;
              return (
                <div
                  key={sys.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 100px 160px 100px",
                    padding: "16px 24px",
                    alignItems: "center",
                    borderBottom:
                      i < visibleSystems.length - 1 ? `1px solid ${T.offWhite}` : "none",
                    position: "relative",
                  }}
                >
                  {sys.illustrative && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                        background: `${T.teal}05`,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 24px",
                        gap: 12,
                        zIndex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: T.mid,
                          fontFamily: "Inter",
                          fontStyle: "italic",
                        }}
                      >
                        Sample data
                      </span>
                      <button
                        style={{
                          marginLeft: "auto",
                          background: T.ember,
                          color: T.white,
                          border: "none",
                          borderRadius: 6,
                          padding: "5px 12px",
                          fontFamily: "Inter",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Unlock →
                      </button>
                    </div>
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: sysColor,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter",
                          fontWeight: 500,
                          color: T.ink,
                        }}
                      >
                        {sys.name}
                      </span>
                    </div>
                    {!sys.illustrative && realCount > 1 && sys.healthScore === maxReal && (
                      <div
                        style={{
                          fontSize: 10,
                          color: T.sys.AUTH,
                          fontFamily: "Inter",
                          fontWeight: 600,
                          marginLeft: 16,
                          marginTop: 2,
                        }}
                      >
                        STRONGEST SYSTEM
                      </div>
                    )}
                    {!sys.illustrative && realCount > 1 && sys.healthScore === minReal && (
                      <div
                        style={{
                          fontSize: 10,
                          color: T.danger,
                          fontFamily: "Inter",
                          fontWeight: 600,
                          marginLeft: 16,
                          marginTop: 2,
                        }}
                      >
                        LOWEST SCORE
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: sys.severity === "not_assessed" ? T.mid : T.ink,
                    }}
                  >
                    {sys.severity === "not_assessed" ? "—" : Math.round(sys.healthScore)}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: severityBg(sys.severity),
                      color: severityColor(sys.severity),
                      fontSize: 11,
                      fontFamily: "Inter",
                      fontWeight: 600,
                      width: "fit-content",
                    }}
                  >
                    {severityLabelText(sys.severity)}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        height: 6,
                        flex: 1,
                        background: T.offWhite,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          width: `${sys.healthScore}%`,
                          background: sysColor,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
                    {sys.trackingScore >= 60 ? "High" : sys.trackingScore >= 40 ? "Moderate" : "Low"}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Top Risks */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Top System Risks</SectionLabel>
          <h2
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 22,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 16px",
            }}
          >
            Where the architecture is straining.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {narrative
              ? narrative.risks.map((risk) => (
                  <Card
                    key={risk.rank}
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                      borderLeft: `3px solid ${T.ember}`,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: T.offWhite,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.mid,
                      }}
                    >
                      {risk.rank}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: "Inter",
                          fontWeight: 700,
                          color: T.ember,
                          letterSpacing: "0.1em",
                          marginBottom: 4,
                        }}
                      >
                        {risk.system.toUpperCase()}
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter",
                          color: T.ink,
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {risk.text}
                      </p>
                    </div>
                  </Card>
                ))
              : [1, 2, 3].map((n) => (
                  <Card
                    key={n}
                    style={{
                      padding: "16px 20px",
                      borderLeft: `3px solid ${T.ember}`,
                    }}
                  >
                    <div style={{ height: 10, width: "92%", background: "#EDEDE8", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 10, width: "75%", background: "#EDEDE8", borderRadius: 4 }} />
                  </Card>
                ))}

          </div>
        </div>

        {/* Matrix Map Teaser */}
        <div style={{ marginBottom: 32 }}>
          <Card style={{ padding: "24px 28px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <SectionLabel>Revenue Health Matrix™ Map</SectionLabel>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 20,
                    fontWeight: 400,
                    color: T.ink,
                    margin: "0 0 8px",
                  }}
                >
                  See how these systems connect.
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter",
                    color: T.mid,
                    lineHeight: 1.6,
                    margin: "0 0 16px",
                    maxWidth: 380,
                  }}
                >
                  Revenue problems rarely exist in isolation. The Matrix Map shows where friction originates and how it propagates through the organisation.
                </p>
                <Link
                  to="/revenue/matrix-map"
                  style={{
                    background: T.ember,
                    color: T.white,
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontFamily: "Inter",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "inline-block",
                  }}
                >
                  Explore the Matrix Map →
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {visibleSystems.map((sys, i) => {
                  const sysColor = T.sys[sys.code] ?? sys.color_hex;
                  return (
                    <div key={sys.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            background: sysColor + "18",
                            border: `1.5px solid ${sysColor}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 4,
                            filter: sys.illustrative ? "blur(2px)" : "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 16,
                              fontFamily: "Inter",
                              fontWeight: 700,
                              color: sysColor,
                            }}
                          >
                            {Math.round(sys.healthScore)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontFamily: "Inter",
                            color: T.mid,
                            maxWidth: 48,
                            lineHeight: 1.3,
                          }}
                        >
                          {sys.name}
                        </div>
                      </div>
                      {i < visibleSystems.length - 1 && (
                        <span style={{ color: T.mid, fontSize: 14 }}>→</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Tier CTA */}
        {tier === "starter" && (
          <div style={{ marginBottom: 32 }}>
            <Card
              style={{
                background: "rgba(240,82,35,0.04)",
                border: "1px solid rgba(240,82,35,0.2)",
                padding: "24px 28px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: T.ember,
                    letterSpacing: "0.12em",
                    marginBottom: 8,
                  }}
                >
                  YOU'RE ON REVENUE HEALTH SNAPSHOT™
                </div>
                <h3
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 18,
                    fontWeight: 400,
                    color: T.ink,
                    margin: "0 0 6px",
                  }}
                >
                  You've seen 3 of 10 subsystems per revenue system.
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter",
                    color: T.mid,
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  Upgrade to Revenue Health Assessment™ to unlock all 50 subsystems, your full report, and PDF export.
                </p>
              </div>
              <Link
                to="/settings/billing"
                style={{
                  background: T.ember,
                  color: T.white,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 22px",
                  whiteSpace: "nowrap",
                  fontFamily: "Inter",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-block",
                }}
              >
                Upgrade to Assessment™ →
              </Link>
            </Card>
          </div>
        )}

        {tier === "pro" && (
          <div style={{ marginBottom: 32 }}>
            <Card
              style={{
                background: T.abyss,
                border: "none",
                padding: "28px 32px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: T.tealBright,
                    letterSpacing: "0.12em",
                    marginBottom: 8,
                  }}
                >
                  RECOMMENDED NEXT STEP
                </div>
                <h3
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 20,
                    fontWeight: 400,
                    color: T.white,
                    margin: "0 0 8px",
                  }}
                >
                  Revenue Health Diagnostic™
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter",
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.65,
                    margin: 0,
                    maxWidth: 480,
                  }}
                >
                  Validate these self-assessment findings with operational evidence and produce a sequenced roadmap for your team.
                </p>
              </div>
              <Link
                to="/settings/billing"
                style={{
                  background: T.ember,
                  color: T.white,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 22px",
                  whiteSpace: "nowrap",
                  fontFamily: "Inter",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-block",
                }}
              >
                Learn about the Diagnostic →
              </Link>
            </Card>
          </div>
        )}

        {tier === "diagnostic" && (
          <div style={{ marginBottom: 32 }}>
            <Card
              style={{
                background: T.abyss,
                border: "none",
                padding: "28px 32px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: T.tealBright,
                    letterSpacing: "0.12em",
                    marginBottom: 8,
                  }}
                >
                  RECOMMENDED NEXT STEP
                </div>
                <h3
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 20,
                    fontWeight: 400,
                    color: T.white,
                    margin: "0 0 8px",
                  }}
                >
                  Build your Revenue Roadmap
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter",
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.65,
                    margin: 0,
                    maxWidth: 480,
                  }}
                >
                  Turn these findings into a sequenced 90-day operating plan with your team.
                </p>
              </div>
              <Link
                to="/revenue/roadmap-builder"
                style={{
                  background: T.ember,
                  color: T.white,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 22px",
                  whiteSpace: "nowrap",
                  fontFamily: "Inter",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-block",
                }}
              >
                Open Roadmap Builder →
              </Link>
            </Card>
          </div>
        )}

        {/* Method Note */}
        <div
          style={{
            padding: "16px 0",
            borderTop: `1px solid ${T.offWhite}`,
            fontSize: 11,
            fontFamily: "Inter",
            color: T.mid,
            lineHeight: 1.65,
          }}
        >
          <span style={{ fontWeight: 600 }}>Method note: </span>
          This analysis is based on self-reported operational perception. Scores reflect the founder's current assessment of each capability area. Some findings may benefit from external validation — consider a Revenue Health Diagnostic™ to test these conclusions against operational evidence.
          <br />
          <span style={{ marginTop: 6, display: "block" }}>
            © 2025 Marketplace Maven. All rights reserved.
          </span>
        </div>
      </main>
    </div>
  );
}

