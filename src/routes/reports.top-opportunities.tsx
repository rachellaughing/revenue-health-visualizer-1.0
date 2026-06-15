import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getTopOpportunities,
  type TopOpportunities,
  type OpportunityItem,
} from "@/lib/report.functions";

export const Route = createFileRoute("/reports/top-opportunities")({
  head: () => ({
    meta: [{ title: "Top Opportunities — Revenue Health Visualiser" }],
  }),
  component: Page,
});

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  teal: "#2A6B6E",
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

function severityStyle(s: string) {
  if (s === "critical") return { color: T.danger, bg: "rgba(239,68,68,0.1)" };
  if (s === "fragile") return { color: T.sand, bg: "rgba(196,149,106,0.12)" };
  if (s === "stable") return { color: T.sys.AUTH, bg: "rgba(43,180,87,0.1)" };
  return { color: T.mid, bg: T.offWhite };
}
function effortStyle(e: string) {
  if (e === "Low") return { color: T.sys.AUTH, bg: "rgba(43,180,87,0.1)" };
  if (e === "Medium") return { color: T.sand, bg: "rgba(196,149,106,0.12)" };
  if (e === "High") return { color: T.danger, bg: "rgba(239,68,68,0.1)" };
  return { color: T.mid, bg: T.offWhite };
}

function Page() {
  const fetchFn = useServerFn(getTopOpportunities);
  const { data } = useQuery({
    queryKey: ["top-opportunities"],
    queryFn: () => fetchFn({ data: {} }),
  });

  const [filterSystem, setFilterSystem] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!data) return <div style={{ minHeight: "100dvh", background: T.paper }} />;
  if ("error" in data) {
    return (
      <div style={{ minHeight: "100dvh", background: T.paper, padding: 40 }}>
        <p style={{ fontFamily: "Inter", color: T.mid }}>
          Complete a Health Check to see your Top Opportunities.
        </p>
      </div>
    );
  }

  const payload = data as TopOpportunities;
  const isStarter = payload.tier === "starter";
  const selectedSet = new Set(payload.selectedChildIds);

  return (
    <PageBody
      payload={payload}
      isStarter={isStarter}
      selectedSet={selectedSet}
      filterSystem={filterSystem}
      setFilterSystem={setFilterSystem}
      expandedId={expandedId}
      setExpandedId={setExpandedId}
    />
  );
}

function PageBody({
  payload,
  isStarter,
  selectedSet,
  filterSystem,
  setFilterSystem,
  expandedId,
  setExpandedId,
}: {
  payload: TopOpportunities;
  isStarter: boolean;
  selectedSet: Set<string>;
  filterSystem: string;
  setFilterSystem: (s: string) => void;
  expandedId: string | null;
  setExpandedId: (s: string | null) => void;
}) {
  const systems = ["all", "POS", "AUTH", "CONV", "LFC", "VIS"];
  const systemLabels: Record<string, string> = {
    all: "All Systems",
    POS: "Positioning",
    AUTH: "Authority",
    CONV: "Conversion",
    LFC: "Lifecycle",
    VIS: "Visibility",
  };

  const filtered = useMemo(() => {
    const list = payload.opportunities.filter(
      (o) => filterSystem === "all" || o.parentCode === filterSystem,
    );
    if (!isStarter) return list;
    return [...list].sort((a, b) => {
      const aA = selectedSet.has(a.childSystemId);
      const bA = selectedSet.has(b.childSystemId);
      if (aA && !bA) return -1;
      if (!aA && bA) return 1;
      return b.opportunityScore - a.opportunityScore;
    });
  }, [payload.opportunities, filterSystem, isStarter, selectedSet]);

  // First assessed card open by default
  const defaultOpen = useMemo(() => {
    const first = filtered.find((o) =>
      isStarter ? selectedSet.has(o.childSystemId) : true,
    );
    return first?.code ?? null;
  }, [filtered, isStarter, selectedSet]);

  const effectiveExpanded = expandedId === null ? defaultOpen : expandedId;

  const assessedCount = payload.opportunities.filter((o) => o.assessed).length;

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 40px 80px" }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontSize: 11,
            fontFamily: "Inter",
            color: T.mid,
            marginBottom: 20,
            letterSpacing: "0.08em",
          }}
        >
          REVENUE HEALTH MATRIX™ &nbsp;›&nbsp; TOP OPPORTUNITIES
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            Top Opportunities
          </h1>
          <p
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: T.mid,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 620,
            }}
          >
            Ranked by opportunity score — a combination of how weak the system is and how many
            other systems break when it's left unaddressed. Fix the top items first for the
            highest compounding return.
          </p>
        </div>

        {/* How opportunity score is calculated */}
        <div
          style={{
            background: T.white,
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>📐</span>
          <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.65 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>
              How opportunity score is calculated:{" "}
            </span>
            Each subsystem is scored on improvement potential (100 − health score) multiplied by
            a cascade weight based on how many downstream systems are also weak. A subsystem
            that scores 40 AND breaks three other fragile systems ranks higher than one that
            simply scores low in isolation.
          </div>
        </div>

        {/* Self-assessment note */}
        <div
          style={{
            background: "rgba(196,149,106,0.08)",
            border: "1px solid rgba(196,149,106,0.25)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔍</span>
          <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>Self-assessment reminder: </span>
            These rankings reflect your current perception. High-confidence, low-tracking
            systems may be more fragile than they appear — their true opportunity score may be
            higher than shown.{" "}
            <a
              href="https://marketplacemaven.com/core-concepts/founder-blindspots/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: T.teal, fontWeight: 500 }}
            >
              Read about founder blind spots →
            </a>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {systems.map((sys) => {
            const active = filterSystem === sys;
            const color = sys === "all" ? T.abyss : T.sys[sys];
            return (
              <button
                key={sys}
                onClick={() => setFilterSystem(sys)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1.5px solid ${active ? color : "rgba(0,0,0,0.1)"}`,
                  background: active ? (sys === "all" ? T.abyss : color + "15") : T.white,
                  color: active ? (sys === "all" ? T.white : color) : T.mid,
                  fontFamily: "Inter",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {systemLabels[sys]}
              </button>
            );
          })}
        </div>

        {/* Cards */}
        <div style={{ position: "relative" }}>
          {filtered.map((opp, i) => {
            const isLocked = isStarter && !selectedSet.has(opp.childSystemId);
            return (
              <OpportunityCard
                key={opp.childSystemId}
                opp={opp}
                rank={i + 1}
                expanded={effectiveExpanded === opp.code && !isLocked}
                onToggle={() =>
                  setExpandedId(effectiveExpanded === opp.code ? "__none__" : opp.code)
                }
                isLocked={isLocked}
              />
            );
          })}

          {isStarter && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 180,
                background: `linear-gradient(to bottom, transparent, ${T.paper}ee, ${T.paper})`,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 20,
                pointerEvents: "none",
              }}
            >
              <div style={{ pointerEvents: "all", textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter",
                    color: T.mid,
                    marginBottom: 10,
                  }}
                >
                  Showing opportunities for {assessedCount} of {payload.opportunities.length}{" "}
                  subsystems
                </p>
                <button
                  style={{
                    background: T.ember,
                    color: T.white,
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontFamily: "Inter",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Upgrade to see all opportunities →
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            paddingTop: 24,
            marginTop: 32,
            borderTop: `1px solid ${T.offWhite}`,
            fontSize: 11,
            fontFamily: "Inter",
            color: T.mid,
          }}
        >
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}

function OpportunityCard({
  opp,
  rank,
  expanded,
  onToggle,
  isLocked,
}: {
  opp: OpportunityItem;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  isLocked: boolean;
}) {
  const color = T.sys[opp.parentCode] ?? opp.parentColorHex;
  const sev = severityStyle(opp.severity);
  const eff = effortStyle(opp.effortLevel);

  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${expanded ? color + "40" : "rgba(0,0,0,0.07)"}`,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        boxShadow: expanded
          ? `0 4px 16px ${color}12`
          : "0 2px 6px rgba(24,40,41,0.04)",
        transition: "all 0.2s",
        filter: isLocked ? "blur(3px)" : "none",
        userSelect: isLocked ? "none" : "auto",
        opacity: isLocked ? 0.7 : 1,
      }}
    >
      <button
        onClick={!isLocked ? onToggle : undefined}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "52px 1fr auto auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          background: expanded ? color + "06" : "transparent",
          border: "none",
          cursor: isLocked ? "not-allowed" : "pointer",
          textAlign: "left",
          borderBottom: expanded ? `1px solid ${T.offWhite}` : "none",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: expanded ? color : T.offWhite,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontFamily: "Inter",
              fontWeight: 700,
              color: expanded ? T.white : T.mid,
            }}
          >
            {rank}
          </span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontFamily: "Inter",
                fontWeight: 600,
                color: T.ink,
              }}
            >
              {opp.name}
            </span>
            <span style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>
              {opp.parentName}
            </span>
          </div>
          {!expanded && opp.coreSymptom && (
            <p
              style={{
                fontSize: 12,
                fontFamily: "Inter",
                color: T.mid,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {opp.coreSymptom.length > 70
                ? opp.coreSymptom.substring(0, 70) + "…"
                : opp.coreSymptom}
            </p>
          )}
        </div>

        <div style={{ textAlign: "center", minWidth: 48 }}>
          <div style={{ fontSize: 20, fontFamily: "Inter", fontWeight: 700, color: T.ink }}>
            {opp.healthScore}
          </div>
          <div
            style={{
              fontSize: 9,
              fontFamily: "Inter",
              color: T.mid,
              letterSpacing: "0.08em",
            }}
          >
            HEALTH
          </div>
        </div>

        <div
          style={{
            padding: "3px 10px",
            borderRadius: 20,
            background: sev.bg,
            color: sev.color,
            fontSize: 10,
            fontFamily: "Inter",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {opp.severity.charAt(0).toUpperCase() + opp.severity.slice(1)}
        </div>

        <div style={{ textAlign: "center", minWidth: 56 }}>
          <div
            style={{
              fontSize: 16,
              fontFamily: "Inter",
              fontWeight: 700,
              color: color,
            }}
          >
            {opp.opportunityScore}
          </div>
          <div
            style={{
              fontSize: 9,
              fontFamily: "Inter",
              color: T.mid,
              letterSpacing: "0.06em",
            }}
          >
            OPP. SCORE
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            color: T.mid,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
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
                WHAT'S HAPPENING
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
                {opp.coreSymptom}
              </p>
            </div>

            <div>
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
                LIKELY ROOT CAUSE
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
                {opp.likelyRootCause}
              </p>
            </div>

            <div>
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
                EFFORT & TIMEFRAME
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: eff.bg,
                    color: eff.color,
                    fontSize: 11,
                    fontFamily: "Inter",
                    fontWeight: 600,
                  }}
                >
                  {opp.effortLevel} effort
                </div>
                <div
                  style={{
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: T.offWhite,
                    color: T.mid,
                    fontSize: 11,
                    fontFamily: "Inter",
                    fontWeight: 500,
                  }}
                >
                  {opp.timeframe}
                </div>
              </div>
            </div>
          </div>

          {opp.cascadeImpacts.length > 0 && (
            <div
              style={{
                background: T.offWhite,
                borderRadius: 10,
                padding: "16px 18px",
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
                IF LEFT UNADDRESSED — CASCADE IMPACTS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {opp.cascadeImpacts.map((impact, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: T.white,
                        border: `1.5px solid ${color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: color,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter",
                            fontWeight: 600,
                            color: T.ink,
                          }}
                        >
                          {impact.system}
                        </span>
                        {impact.score !== null && impact.score < 60 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: "Inter",
                              fontWeight: 600,
                              color: T.danger,
                              background: "rgba(239,68,68,0.1)",
                              padding: "1px 6px",
                              borderRadius: 8,
                            }}
                          >
                            Also weak ({impact.score})
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter",
                          color: T.mid,
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {impact.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Link
              to="/reports/revenue-system-health"
              style={{
                background: "transparent",
                border: `1px solid ${color}`,
                color: color,
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "Inter",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              View in Revenue System Health →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
