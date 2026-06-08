import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getFounderDependency,
  type FounderDependencyData,
  type FDSystem,
  type FDProcess,
} from "@/lib/report.functions";

export const Route = createFileRoute("/reports/founder-dependency")({
  head: () => ({ meta: [{ title: "Founder Dependency — Revenue Health Visualiser" }] }),
  component: Page,
});

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  teal: "#2A6B6E",
  tealBright: "#4ABFC4",
  sand: "#C4956A",
  mid: "#888880",
  ink: "#111111",
  white: "#FFFFFF",
  healthy: "#10B981",
  danger: "#EF4444",
};

const BLAST_WINDOWS: FDProcess["window"][] = ["immediate", "1-7 days", "7-30 days", "30-90 days"];
const WINDOW_LABELS: Record<FDProcess["window"], string> = {
  "immediate": "Immediate",
  "1-7 days": "1-7 Days",
  "7-30 days": "7-30 Days",
  "30-90 days": "30-90 Days",
};

function depColor(label: string): string {
  if (label === "critical" || label === "dangerous") return T.danger;
  if (label === "high") return T.sand;
  if (label === "moderate" || label === "mixed" || label === "low-moderate") return "#F59E0B";
  return T.healthy;
}
function depBg(label: string): string {
  if (label === "critical" || label === "dangerous") return "rgba(239,68,68,0.08)";
  if (label === "high") return "rgba(196,149,106,0.1)";
  if (label === "moderate" || label === "mixed" || label === "low-moderate") return "rgba(245,158,11,0.08)";
  return "rgba(16,185,129,0.08)";
}

function ringLabel(score: number): string {
  if (score > 70) return "High Dependency";
  if (score > 50) return "Moderate";
  if (score > 30) return "Low-Moderate";
  return "Low";
}
function ringColor(score: number): string {
  if (score > 70) return T.danger;
  if (score > 50) return T.sand;
  if (score > 30) return "#F59E0B";
  return T.healthy;
}

function RiskDots({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < level ? T.danger : T.offWhite,
          }}
        />
      ))}
    </div>
  );
}

function DependencyRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = ringColor(score);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.offWhite} strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={T.ink}
          fontSize={size * 0.22}
          fontFamily="Inter"
          fontWeight={700}
          style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        >
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 700, color, marginTop: 4 }}>
        {ringLabel(score)}
      </div>
      <div style={{ fontSize: 10, fontFamily: "Inter", color: T.mid }}>Dependency Index</div>
    </div>
  );
}

function DependencySplit({ processes, systems }: { processes: FDProcess[]; systems: FDSystem[] }) {
  const colorByCode = new Map(systems.map((s) => [s.code, s.color]));
  const dangerous = processes.filter((p) => p.type === "dangerous");
  const healthy = processes.filter((p) => p.type === "healthy");

  const renderCol = (
    items: FDProcess[],
    label: string,
    color: string,
    bg: string,
    border: string,
    blurb: string,
  ) => (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <div
          style={{
            fontSize: 11,
            fontFamily: "Inter",
            fontWeight: 700,
            color,
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
      </div>
      <p
        style={{
          fontSize: 12,
          fontFamily: "Inter",
          color: T.mid,
          lineHeight: 1.6,
          margin: "0 0 14px",
        }}
      >
        {blurb}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: colorByCode.get(p.code) ?? T.mid,
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            <span style={{ fontSize: 12, fontFamily: "Inter", color: T.ink, lineHeight: 1.4 }}>
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {renderCol(
        dangerous,
        "DANGEROUS DEPENDENCY",
        T.danger,
        "rgba(239,68,68,0.05)",
        "rgba(239,68,68,0.2)",
        "Processes that will break or degrade without the founder. Creates a growth ceiling and key-person risk.",
      )}
      {renderCol(
        healthy,
        "HEALTHY DEPENDENCY",
        T.healthy,
        "rgba(16,185,129,0.05)",
        "rgba(16,185,129,0.2)",
        "Appropriate founder ownership at this stage. Strategy, culture, and vision-setting are founder work.",
      )}
    </div>
  );
}

function BlastRadiusTimeline({ processes, systems }: { processes: FDProcess[]; systems: FDSystem[] }) {
  const colorByCode = new Map(systems.map((s) => [s.code, s.color]));
  const dangerous = processes.filter((p) => p.type === "dangerous");
  const dotColors = [T.danger, "#F97316", T.sand, "#F59E0B"];
  return (
    <div>
      <p
        style={{
          fontSize: 13,
          fontFamily: "Inter",
          color: T.mid,
          lineHeight: 1.65,
          margin: "0 0 24px",
        }}
      >
        If the founder became unavailable today, here is the sequence in which revenue-critical
        processes would begin to degrade.
      </p>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 24,
            bottom: 24,
            width: 2,
            background: T.offWhite,
            borderRadius: 2,
          }}
        />
        {BLAST_WINDOWS.map((window, wi) => {
          const items = dangerous.filter((p) => p.window === window);
          if (items.length === 0) return null;
          const dot = dotColors[wi];
          return (
            <div key={window} style={{ display: "flex", gap: 20, marginBottom: 24 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: dot + "20",
                  border: `2px solid ${dot}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <div
                  style={{ width: 10, height: 10, borderRadius: "50%", background: dot }}
                />
              </div>
              <div style={{ flex: 1, paddingTop: 6 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: dot,
                    marginBottom: 10,
                  }}
                >
                  {WINDOW_LABELS[window]}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        background: T.white,
                        border: `1px solid ${dot}25`,
                        borderLeft: `3px solid ${dot}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: colorByCode.get(p.code) ?? T.mid,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter",
                            fontWeight: 600,
                            color: T.ink,
                          }}
                        >
                          {p.name}
                        </span>
                        <div style={{ marginLeft: "auto" }}>
                          <RiskDots level={p.risk} />
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          fontFamily: "Inter",
                          color: T.mid,
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {p.whyDependent}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionPlan({ processes, systems }: { processes: FDProcess[]; systems: FDSystem[] }) {
  const colorByCode = new Map(systems.map((s) => [s.code, s.color]));
  const dangerous = processes.filter((p) => p.type === "dangerous").sort((a, b) => b.risk - a.risk);
  const diffColor: Record<string, string> = { easy: T.healthy, medium: T.sand, hard: T.danger };
  return (
    <div>
      <p
        style={{
          fontSize: 13,
          fontFamily: "Inter",
          color: T.mid,
          lineHeight: 1.65,
          margin: "0 0 24px",
        }}
      >
        Sequenced by risk level. Address the highest-risk dependencies first — each has a concrete
        first step that can begin this week.
      </p>
      {dangerous.map((p, i) => {
        const sysColor = colorByCode.get(p.code) ?? T.mid;
        const dc = diffColor[p.difficulty] ?? T.mid;
        return (
          <div
            key={i}
            style={{
              background: T.white,
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 12,
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
                background: sysColor + "18",
                border: `1.5px solid ${sysColor}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  color: sysColor,
                }}
              >
                {i + 1}
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontFamily: "Inter",
                  fontWeight: 600,
                  color: T.ink,
                  marginBottom: 4,
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginBottom: 10 }}>
                {p.systemName} System
              </div>
              <div
                style={{
                  background: T.teal + "08",
                  border: `1px solid ${T.teal}20`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: T.teal,
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  RECOMMENDED FIRST STEP
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter",
                    color: T.ink,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {p.firstStep}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flexShrink: 0,
                alignItems: "flex-end",
              }}
            >
              <RiskDots level={p.risk} />
              <div
                style={{
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: dc + "18",
                  color: dc,
                  fontSize: 10,
                  fontFamily: "Inter",
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {p.difficulty} to delegate
              </div>
              <div style={{ fontSize: 10, fontFamily: "Inter", color: T.mid }}>
                {WINDOW_LABELS[p.window]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SystemsTab({
  systems,
  processes,
  isDiagnostic,
}: {
  systems: FDSystem[];
  processes: FDProcess[];
  isDiagnostic: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(systems[0]?.code ?? null);
  return (
    <div>
      {systems.map((dep) => {
        const dc = depColor(dep.type);
        const isExpanded = expanded === dep.code;
        const sysProc = processes.filter((p) => p.code === dep.code);
        const dangerous = sysProc.filter((p) => p.type === "dangerous");
        const healthy = sysProc.filter((p) => p.type === "healthy");
        return (
          <div
            key={dep.code}
            style={{
              background: T.white,
              border: `1px solid ${isExpanded ? dep.color + "40" : "rgba(0,0,0,0.07)"}`,
              borderRadius: 12,
              marginBottom: 12,
              overflow: "hidden",
              boxShadow: isExpanded
                ? `0 4px 16px ${dep.color}10`
                : "0 2px 6px rgba(24,40,41,0.04)",
            }}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : dep.code)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                background: isExpanded ? dep.color + "06" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: isExpanded ? `1px solid ${T.offWhite}` : "none",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: dep.color }} />
              <span style={{ fontSize: 14, fontFamily: "Inter", fontWeight: 600, color: T.ink }}>
                {dep.name}
              </span>
              <div
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: depBg(dep.type),
                  color: dc,
                  fontSize: 10,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {dep.type}
              </div>
              <div
                style={{
                  width: 60,
                  height: 6,
                  background: T.offWhite,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${dep.level}%`,
                    background: dc,
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: T.mid,
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  display: "inline-block",
                }}
              >
                ⌄
              </span>
            </button>
            {isExpanded && (
              <div style={{ padding: "20px 24px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <Tile value={dep.level} label="DEPENDENCY LEVEL" color={dc} />
                  <Tile value={dangerous.length} label="DANGEROUS PROCESSES" color={T.danger} />
                  <Tile value={healthy.length} label="HEALTHY PROCESSES" color={T.healthy} />
                </div>
                {sysProc.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.mid,
                        letterSpacing: "0.1em",
                        marginBottom: 10,
                      }}
                    >
                      IDENTIFIED PROCESSES
                    </div>
                    {sysProc.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 14px",
                          marginBottom: 8,
                          background:
                            p.type === "dangerous"
                              ? "rgba(239,68,68,0.04)"
                              : "rgba(16,185,129,0.04)",
                          border: `1px solid ${
                            p.type === "dangerous"
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(16,185,129,0.15)"
                          }`,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            flexShrink: 0,
                            marginTop: 4,
                            background: p.type === "dangerous" ? T.danger : T.healthy,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontFamily: "Inter",
                              fontWeight: 600,
                              color: T.ink,
                              marginBottom: 2,
                            }}
                          >
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>
                            {p.whyDependent}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <RiskDots level={p.risk} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {dep.handoffReadiness && (
                  <div
                    style={{
                      background: T.teal + "06",
                      border: `1px solid ${T.teal}20`,
                      borderRadius: 10,
                      padding: "14px 16px",
                      marginBottom: isDiagnostic && dep.narrative ? 16 : 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.teal,
                        letterSpacing: "0.1em",
                        marginBottom: 6,
                      }}
                    >
                      HANDOFF READINESS
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter",
                        color: T.ink,
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {dep.handoffReadiness}
                    </p>
                  </div>
                )}
                {isDiagnostic && dep.narrative && (
                  <div
                    style={{
                      background: T.abyss + "06",
                      border: `1px solid ${T.teal}20`,
                      borderRadius: 10,
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.teal,
                        letterSpacing: "0.1em",
                        marginBottom: 8,
                      }}
                    >
                      CONSULTANT OBSERVATION
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter",
                        color: T.ink,
                        lineHeight: 1.75,
                        margin: 0,
                      }}
                    >
                      {dep.narrative}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      style={{
        background: T.offWhite,
        borderRadius: 10,
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontFamily: "Instrument Serif, Georgia, serif",
          color,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          fontFamily: "Inter",
          fontWeight: 700,
          color: T.mid,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Page() {
  const fetchFn = useServerFn(getFounderDependency);
  const { data, isLoading, error } = useQuery({
    queryKey: ["founder-dependency"],
    queryFn: () => fetchFn({ data: {} }),
  });
  const [activeTab, setActiveTab] = useState<"overview" | "systems" | "timeline" | "actions">(
    "overview",
  );

  if (isLoading) {
    return (
      <div style={{ padding: 40, color: T.mid, fontFamily: "Inter" }}>Loading report…</div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: 40, color: T.danger, fontFamily: "Inter" }}>
        Failed to load report.
      </div>
    );
  }
  if ("error" in data) {
    return (
      <div style={{ padding: 40, color: T.mid, fontFamily: "Inter" }}>
        Complete your Health Check to view this report.
      </div>
    );
  }

  const d = data as FounderDependencyData;
  const isDiagnostic = d.tier === "diagnostic";
  const isStarter = d.tier === "starter";
  const blurContent = isStarter;
  const showIllustrativeLabel = d.tier === "pro";

  const TABS: { id: typeof activeTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "systems", label: "System by System" },
    { id: "timeline", label: "Blast Radius" },
    { id: "actions", label: "Action Plan" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div
          style={{
            fontSize: 11,
            color: T.mid,
            marginBottom: 20,
            letterSpacing: "0.08em",
          }}
        >
          REVENUE HEALTH MATRIX™ › FOUNDER DEPENDENCY
        </div>

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
                REVENUE HEALTH DIAGNOSTIC™
              </div>
              <h3
                style={{
                  fontFamily: "Instrument Serif, Georgia, serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: T.white,
                  margin: "0 0 6px",
                }}
              >
                {isStarter
                  ? "Founder Dependency analysis is available in the Revenue Health Diagnostic™."
                  : "Your Dependency Index is estimated from your Health Check scores. Full analysis requires the Diagnostic."}
              </h3>
              <p
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  margin: 0,
                  lineHeight: 1.6,
                  maxWidth: 500,
                }}
              >
                {isStarter
                  ? "This report identifies every process that runs through you, classifies dependency as healthy or dangerous, shows a blast radius timeline, and delivers a sequenced action plan."
                  : "The Diagnostic adds consultant observations, process-level dependency classification, the blast radius timeline, and a sequenced action plan."}
              </p>
            </div>
            <a
              href="https://marketplacemaven.com"
              target="_blank"
              rel="noreferrer"
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
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Learn about the Diagnostic™
            </a>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            alignItems: "flex-start",
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "Instrument Serif, Georgia, serif",
                fontSize: 26,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 8px",
              }}
            >
              Founder Dependency Analysis
            </h1>
            <p
              style={{
                fontFamily: "Inter",
                fontSize: 14,
                color: T.mid,
                margin: 0,
                lineHeight: 1.65,
                maxWidth: 540,
              }}
            >
              Every business has founder dependency. The question is whether it is strategic and
              temporary, or structural and dangerous. This analysis identifies exactly where your
              business runs through you — and what it would take to change that.
            </p>
            {d.preliminary && d.state !== "pending" && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  fontFamily: "Inter",
                  color: T.sand,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                ~{d.overall.index} (ESTIMATED) — CONFIRMED IN DIAGNOSTIC™
              </div>
            )}
          </div>
          {d.state !== "pending" && <DependencyRing score={d.overall.index} />}
        </div>

        {d.state === "pending" ? (
          <div
            style={{
              background: T.white,
              border: `1px dashed ${T.teal}40`,
              borderRadius: 14,
              padding: "40px 32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: "Inter",
                fontWeight: 700,
                color: T.teal,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              PENDING DIAGNOSTIC
            </div>
            <h2
              style={{
                fontFamily: "Instrument Serif, Georgia, serif",
                fontSize: 22,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 10px",
              }}
            >
              Your dependency index will be calculated after your Revenue Health Diagnostic™
              session.
            </h2>
            <p
              style={{
                fontSize: 13,
                fontFamily: "Inter",
                color: T.mid,
                margin: "0 auto",
                maxWidth: 520,
                lineHeight: 1.65,
              }}
            >
              Preliminary estimate from your Health Check tracking scores: ~{d.overall.index}.
              The full dependency profile, process-level classification, and action plan are
              produced during your Diagnostic session.
            </p>
          </div>
        ) : (
          <>
            {/* Tab nav */}
            <div
              style={{
                display: "flex",
                gap: 2,
                background: T.offWhite,
                borderRadius: 10,
                padding: 4,
                marginBottom: 28,
                width: "fit-content",
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === tab.id ? T.white : "transparent",
                    color: activeTab === tab.id ? T.ink : T.mid,
                    fontFamily: "Inter",
                    fontSize: 12,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    boxShadow:
                      activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {showIllustrativeLabel && (
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "Inter",
                  fontWeight: 600,
                  color: T.sand,
                  letterSpacing: "0.08em",
                  marginBottom: 14,
                }}
              >
                ILLUSTRATIVE — CONFIRMED IN DIAGNOSTIC™
              </div>
            )}

            <div
              style={{
                filter: blurContent ? "blur(3px)" : "none",
                userSelect: blurContent ? "none" : "auto",
                pointerEvents: blurContent ? "none" : "auto",
              }}
            >
              {activeTab === "overview" && (
                <div>
                  {isDiagnostic && d.overall.executiveSummary && (
                    <div
                      style={{
                        background: T.white,
                        border: "1px solid rgba(0,0,0,0.07)",
                        borderRadius: 14,
                        padding: 28,
                        marginBottom: 24,
                        boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: "Inter",
                          fontWeight: 700,
                          color: T.mid,
                          letterSpacing: "0.1em",
                          marginBottom: 12,
                        }}
                      >
                        EXECUTIVE SUMMARY
                      </div>
                      <p
                        style={{
                          fontFamily: "Inter",
                          fontSize: 14,
                          color: T.ink,
                          lineHeight: 1.75,
                          margin: 0,
                        }}
                      >
                        {d.overall.executiveSummary}
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.mid,
                        letterSpacing: "0.1em",
                        marginBottom: 14,
                      }}
                    >
                      HEALTHY VS DANGEROUS DEPENDENCY
                    </div>
                    <DependencySplit processes={d.processes} systems={d.systems} />
                  </div>

                  <div
                    style={{
                      background: T.white,
                      border: "1px solid rgba(0,0,0,0.07)",
                      borderRadius: 14,
                      padding: 24,
                      marginBottom: 24,
                      boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.mid,
                        letterSpacing: "0.1em",
                        marginBottom: 16,
                      }}
                    >
                      DEPENDENCY BY SYSTEM
                    </div>
                    {d.systems.map((dep) => {
                      const dc = depColor(dep.type);
                      return (
                        <div key={dep.code} style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{ display: "flex", alignItems: "center", gap: 8 }}
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: dep.color,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 12,
                                  fontFamily: "Inter",
                                  fontWeight: 600,
                                  color: T.ink,
                                }}
                              >
                                {dep.name}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  background: depBg(dep.type),
                                  color: dc,
                                  fontSize: 10,
                                  fontFamily: "Inter",
                                  fontWeight: 700,
                                  textTransform: "capitalize",
                                }}
                              >
                                {dep.type}
                              </div>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontFamily: "Inter",
                                  fontWeight: 700,
                                  color: dc,
                                }}
                              >
                                {dep.level}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              height: 8,
                              background: T.offWhite,
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${dep.level}%`,
                                background: dc,
                                borderRadius: 4,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "systems" && (
                <SystemsTab
                  systems={d.systems}
                  processes={d.processes}
                  isDiagnostic={isDiagnostic}
                />
              )}

              {activeTab === "timeline" && (
                <div
                  style={{
                    background: T.white,
                    border: "1px solid rgba(0,0,0,0.07)",
                    borderRadius: 14,
                    padding: 28,
                    boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: T.mid,
                      letterSpacing: "0.1em",
                      marginBottom: 14,
                    }}
                  >
                    BLAST RADIUS TIMELINE
                  </div>
                  <h2
                    style={{
                      fontFamily: "Instrument Serif, Georgia, serif",
                      fontSize: 20,
                      fontWeight: 400,
                      color: T.ink,
                      margin: "0 0 6px",
                    }}
                  >
                    If you stepped back today.
                  </h2>
                  <BlastRadiusTimeline processes={d.processes} systems={d.systems} />
                </div>
              )}

              {activeTab === "actions" && (
                <div
                  style={{
                    background: T.white,
                    border: "1px solid rgba(0,0,0,0.07)",
                    borderRadius: 14,
                    padding: 28,
                    boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: T.mid,
                      letterSpacing: "0.1em",
                      marginBottom: 14,
                    }}
                  >
                    ACTION PLAN
                  </div>
                  <h2
                    style={{
                      fontFamily: "Instrument Serif, Georgia, serif",
                      fontSize: 20,
                      fontWeight: 400,
                      color: T.ink,
                      margin: "0 0 6px",
                    }}
                  >
                    Reduce dependency, one process at a time.
                  </h2>
                  <ActionPlan processes={d.processes} systems={d.systems} />
                </div>
              )}
            </div>

            {d.tier === "pro" && (
              <div
                style={{
                  background: T.abyss,
                  borderRadius: 14,
                  padding: "20px 24px",
                  marginTop: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ color: T.white, fontFamily: "Inter", fontSize: 13 }}>
                  Ready for the full dependency analysis with consultant observations?
                </div>
                <a
                  href="https://marketplacemaven.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: T.ember,
                    color: T.white,
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontFamily: "Inter",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Learn about the Diagnostic™
                </a>
              </div>
            )}
          </>
        )}

        <div
          style={{
            paddingTop: 24,
            borderTop: `1px solid ${T.offWhite}`,
            fontSize: 11,
            fontFamily: "Inter",
            color: T.mid,
            marginTop: 28,
          }}
        >
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
