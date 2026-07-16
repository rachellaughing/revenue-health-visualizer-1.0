import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  getMatrixMap,
  type MatrixMapData,
  type MatrixParentNode,
  type MatrixConnection,
  type MatrixChildNode,
  type MatrixSysConnItem,
  type MatrixScenario,
} from "@/lib/report.functions";
import { useAuth } from "@/lib/auth-context";


export const Route = createFileRoute("/revenue/matrix-map")({
  head: () => ({ meta: [{ title: "Matrix Map — Revenue Health Visualiser" }] }),
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
  sys: {
    POS: "#3B82F6",
    AUTH: "#10B981",
    CONV: "#F05223",
    LFC: "#8B5CF6",
    VIS: "#F59E0B",
  } as Record<string, string>,
};

function healthColor(score: number) {
  if (score < 40) return "#EF4444";
  if (score < 55) return T.sand;
  if (score < 70) return T.sys.VIS;
  return T.sys.AUTH;
}
function severityLabel(score: number) {
  if (score < 40) return "Critical";
  if (score < 55) return "Fragile";
  if (score < 70) return "Stable";
  return "Strong";
}

function Page() {
  const { session, loading: authLoading } = useAuth();
  const fetchFn = useServerFn(getMatrixMap);
  const { data } = useQuery({
    queryKey: ["matrix-map", session?.user?.id ?? "anon"],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !authLoading && !!session,
  });

  if (!data) return <div style={{ minHeight: "100dvh", background: T.paper }} />;

  if ("error" in data) {
    return (
      <div style={{ minHeight: "100dvh", background: T.paper, padding: 40 }}>
        <p style={{ fontFamily: "Inter", color: T.mid }}>
          Complete a Health Check to see your Matrix Map.
        </p>
      </div>
    );
  }
  return <MatrixView payload={data as MatrixMapData} />;
}

function MatrixView({ payload }: { payload: MatrixMapData }) {
  const [activeTab, setActiveTab] = useState<"map" | "simulator">("map");
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [zoomedSystem, setZoomedSystem] = useState<string | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  // Click-point transform origin (percent within stage) + a monotonically
  // increasing key that forces the animation to re-fire on every transition.
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [zoomDir, setZoomDir] = useState<"in" | "out" | null>(null);
  const [zoomKey, setZoomKey] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const isStarter = payload.tier === "starter";

  const originFromEvent = useCallback((e: { clientX: number; clientY: number }) => {
    const stage = stageRef.current;
    if (!stage) return { x: 50, y: 50 };
    const r = stage.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }, []);

  const zoomInTo = useCallback(
    (code: string, e: { clientX: number; clientY: number }) => {
      setZoomOrigin(originFromEvent(e));
      setZoomDir("in");
      setZoomKey((k) => k + 1);
      setZoomedSystem(code);
    },
    [originFromEvent],
  );

  const zoomOut = useCallback(
    (e?: { clientX: number; clientY: number }) => {
      if (e) setZoomOrigin(originFromEvent(e));
      else setZoomOrigin({ x: 50, y: 50 });
      setZoomDir("out");
      setZoomKey((k) => k + 1);
      setZoomedSystem(null);
      setActiveNode(null);
    },
    [originFromEvent],
  );

  const handleNodeClick = useCallback(
    (code: string, e: React.MouseEvent) => {
      if (zoomedSystem) return;
      if (activeNode === code) {
        zoomInTo(code, e);
      } else {
        setActiveNode(code);
      }
    },
    [activeNode, zoomedSystem, zoomInTo],
  );



  const counts = payload.summaryCounts;
  const defaultExpanded = payload.scenarios[0]?.code ?? null;
  const effectiveExpanded = expandedScenario === null ? defaultExpanded : expandedScenario;

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 1020, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div
          style={{
            fontSize: 11,
            color: T.mid,
            marginBottom: 20,
            letterSpacing: "0.08em",
            fontFamily: "Inter",
          }}
        >
          REVENUE HEALTH MATRIX™ &nbsp;›&nbsp;{" "}
          {activeTab === "map" ? "MATRIX MAP" : "SCENARIO SIMULATOR"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 24,
            gap: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 28,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 6px",
              }}
            >
              {activeTab === "map" ? "Revenue Health Matrix™ Map" : "Scenario Simulator"}
            </h1>
            <p
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                color: T.mid,
                margin: 0,
                maxWidth: 520,
                lineHeight: 1.6,
              }}
            >
              {activeTab === "map"
                ? "Revenue problems rarely exist in isolation. This map shows how your five systems are interconnected — and where friction originates."
                : "Explore how improving one system creates ripple effects across your revenue architecture. Scenarios are ranked by confidence and downstream impact."}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              background: T.offWhite,
              borderRadius: 10,
              padding: 3,
              gap: 2,
              flexShrink: 0,
            }}
          >
            {[
              { id: "map", label: "Matrix Map", locked: false },
              { id: "simulator", label: "Scenario Simulator", locked: isStarter },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.locked && setActiveTab(tab.id as "map" | "simulator")}
                  title={tab.locked ? "Available in Revenue Health Assessment™ and above" : ""}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    cursor: tab.locked ? "not-allowed" : "pointer",
                    background: isActive ? T.white : "transparent",
                    color: isActive ? T.ink : T.mid,
                    fontFamily: "Inter",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    opacity: tab.locked ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {tab.locked && <span style={{ fontSize: 10 }}>🔒</span>}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "map" && (
          <>
            {!zoomedSystem && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    label: "Critical",
                    count: counts.critical,
                    color: "#EF4444",
                    desc: "High-impact, immediate",
                  },
                  {
                    label: "Strained",
                    count: counts.strained,
                    color: T.sand,
                    desc: "Monitor closely",
                  },
                  {
                    label: "Needs Attention",
                    count: counts.needsAttention,
                    color: T.sys.VIS,
                    desc: "Improve before impact grows",
                  },
                  {
                    label: "Healthy",
                    count: counts.healthy,
                    color: T.sys.AUTH,
                    desc: "Supporting outcomes",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    style={{
                      background: T.white,
                      border: "1px solid rgba(0,0,0,0.07)",
                      borderTop: `3px solid ${c.color}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontFamily: "'Instrument Serif', Georgia, serif",
                        color: c.color,
                        marginBottom: 2,
                      }}
                    >
                      {c.count}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter",
                        fontWeight: 600,
                        color: T.mid,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {c.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter",
                        color: T.mid,
                        marginTop: 2,
                      }}
                    >
                      {c.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <MatrixBreadcrumb
              zoomedSystemName={
                zoomedSystem
                  ? payload.parents.find((p) => p.code === zoomedSystem)?.name ?? null
                  : null
              }
              zoomedSystemColor={zoomedSystem ? T.sys[zoomedSystem] : undefined}
              onRoot={(e: React.MouseEvent) => zoomOut(e)}
            />


            <div
              ref={stageRef}
              style={{
                position: "relative",
                background: T.white,
                border: "1px solid rgba(0,0,0,0.07)",
                borderRadius: 14,
                padding: 24,
                boxShadow: "0 2px 12px rgba(24,40,41,0.06)",
                marginBottom: 24,
                overflow: "hidden",
              }}
            >
              <style>{`
                @keyframes mmZoomIn { from { transform: scale(0.12); opacity: 0 } to { transform: scale(1); opacity: 1 } }
                @keyframes mmZoomOut { from { transform: scale(5.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
                @media (prefers-reduced-motion: reduce) { .mm-anim-layer { animation: none !important } }
              `}</style>
              <div
                key={zoomKey}
                className="mm-anim-layer"
                style={{
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  animation: zoomDir
                    ? `${zoomDir === "in" ? "mmZoomIn" : "mmZoomOut"} 420ms cubic-bezier(0.22,0.9,0.3,1) both`
                    : "none",
                }}
              >
                {zoomedSystem ? (
                  <ZoomedSystem
                    payload={payload}
                    systemCode={zoomedSystem}
                    isStarter={isStarter}
                    onBack={(e) => zoomOut(e)}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter",
                        color: T.mid,
                        textAlign: "center",
                        marginBottom: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      Click a system to see what's affecting it and what it's driving downstream · click again to zoom into its subsystems
                    </div>

                    <MatrixMapSVG
                      parents={payload.parents}
                      connections={payload.connections}
                      activeNode={activeNode}
                      onNodeClick={handleNodeClick}
                    />
                  </>
                )}
              </div>
            </div>


            {!zoomedSystem && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: T.mid,
                      letterSpacing: "0.1em",
                      marginBottom: 6,
                    }}
                  >
                    KEY CAUSE & EFFECT CHAINS
                  </div>
                  <h2
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontSize: 22,
                      fontWeight: 400,
                      color: T.ink,
                      margin: 0,
                    }}
                  >
                    Where the constraint really lives.
                  </h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {payload.criticalChains.map((chain, i) => {
                    const color = T.sys[chain.parentCode] ?? T.teal;
                    return (
                      <div
                        key={i}
                        style={{
                          background: T.white,
                          border: "1px solid rgba(0,0,0,0.07)",
                          borderLeft: `3px solid ${color}`,
                          borderRadius: 10,
                          padding: "16px 20px",
                        }}
                      >
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
                          {chain.label.toUpperCase()}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                            marginBottom: 10,
                          }}
                        >
                          {chain.nodes.map((node, j) => (
                            <div
                              key={j}
                              style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <div
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 20,
                                  background: color + "15",
                                  border: `1px solid ${color}40`,
                                  fontSize: 12,
                                  fontFamily: "Inter",
                                  fontWeight: 500,
                                  color: T.ink,
                                }}
                              >
                                {node}
                              </div>
                              {j < chain.nodes.length - 1 && (
                                <span style={{ color, fontSize: 14 }}>→</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter",
                            color: T.mid,
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {chain.note}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "simulator" && !isStarter && (
          <SimulatorTab
            scenarios={payload.scenarios}
            selectedSet={new Set(payload.selectedChildIds)}
            expanded={effectiveExpanded}
            onToggle={(code) =>
              setExpandedScenario(effectiveExpanded === code ? "__none__" : code)
            }
          />
        )}

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

function MatrixBreadcrumb({
  zoomedSystemName,
  zoomedSystemColor,
  onRoot,
}: {
  zoomedSystemName: string | null;
  zoomedSystemColor?: string;
  onRoot: (e: React.MouseEvent) => void;
}) {
  const atRoot = !zoomedSystemName;
  const rootColor = atRoot ? T.ink : T.teal;
  const displayName =
    zoomedSystemName && !/\bSystem$/i.test(zoomedSystemName)
      ? `${zoomedSystemName} System`
      : zoomedSystemName;
  return (
    <nav
      aria-label="Matrix Map breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        fontSize: 13,
        fontFamily: "Inter",
        color: T.mid,
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={atRoot ? undefined : onRoot}
        disabled={atRoot}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: atRoot ? "default" : "pointer",
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 18,
          color: rootColor,
          fontWeight: atRoot ? 600 : 400,
          letterSpacing: "0.01em",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          if (!atRoot) e.currentTarget.style.textDecoration = "underline";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = "none";
        }}
      >
        Revenue Health Matrix™
      </button>
      {zoomedSystemName && (
        <>
          <span aria-hidden="true" style={{ color: T.mid }}>
            ›
          </span>
          <span
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              fontWeight: 600,
              color: zoomedSystemColor ?? T.ink,
            }}
          >
            {displayName}
          </span>
        </>
      )}
    </nav>
  );
}

function MatrixMapSVG({

  parents: parentsIn,
  connections,
  activeNode,
  onNodeClick,
}: {
  parents: MatrixParentNode[];
  connections: MatrixConnection[];
  activeNode: string | null;
  onNodeClick: (code: string, e: React.MouseEvent) => void;
}) {
  const W = 860;
  const H = 500;
  // Radial layout — arrange systems evenly around a center point, starting at
  // 12 o'clock and going clockwise. This overrides any server-supplied x/y so
  // the diagram feels like a symmetric "orbit" ready to be zoomed into.
  const parents = useMemo(() => {
    const cx = W / 2;
    const cy = H / 2 - 10;
    const radius = 170;
    const n = parentsIn.length || 1;
    return parentsIn.map((p, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return { ...p, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }, [parentsIn]);
  const byCode = useMemo(() => {
    const m = new Map<string, MatrixParentNode>();
    for (const p of parents) m.set(p.code, p);
    return m;
  }, [parents]);


  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        {parents.map((sys) => (
          <radialGradient
            key={sys.code}
            id={`grad-${sys.code}`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor={T.sys[sys.code]} stopOpacity="0.15" />
            <stop offset="100%" stopColor={T.sys[sys.code]} stopOpacity="0.04" />
          </radialGradient>
        ))}
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="rgba(136,136,128,0.4)" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {connections.map((conn, i) => {
        const from = byCode.get(conn.from);
        const to = byCode.get(conn.to);
        if (!from || !to) return null;
        const strokeWidth = 1 + conn.strength / 3;
        const color = healthColor(from.healthScore);
        const opacity = from.healthScore < 60 ? 0.7 : 0.35;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2 - 30;
        return (
          <g key={i}>
            <path
              d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray={from.healthScore < 60 ? "6,4" : "none"}
              markerEnd="url(#arrow)"
            />
            <text
              x={mx}
              y={my - 8}
              textAnchor="middle"
              fontSize="9"
              fontFamily="Inter"
              fill={color}
              opacity="0.6"
            >
              {conn.strength} {conn.strength === 1 ? "link" : "links"}
            </text>
          </g>
        );
      })}

      {parents.map((sys) => {
        const isActive = activeNode === sys.code;
        const r = 58;
        const hColor = healthColor(sys.healthScore);
        const sysColor = T.sys[sys.code];
        return (
          <g
            key={sys.code}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(sys.code, e);
            }}

            style={{ cursor: "pointer" }}
            filter={isActive ? "url(#glow)" : undefined}
          >
            <circle
              cx={sys.x}
              cy={sys.y}
              r={r + 6}
              fill="none"
              stroke={hColor}
              strokeWidth={isActive ? 3 : 2}
              strokeOpacity={isActive ? 1 : 0.5}
            />
            <circle
              cx={sys.x}
              cy={sys.y}
              r={r}
              fill={`url(#grad-${sys.code})`}
              stroke={sysColor}
              strokeWidth={isActive ? 2.5 : 1.5}
              strokeOpacity={isActive ? 1 : 0.6}
            />
            <text
              x={sys.x}
              y={sys.y - 10}
              textAnchor="middle"
              fontSize="22"
              fontFamily="Inter"
              fontWeight="700"
              fill={T.ink}
            >
              {sys.healthScore}
            </text>
            <text
              x={sys.x}
              y={sys.y + 12}
              textAnchor="middle"
              fontSize="12"
              fontFamily="Inter"
              fontWeight="600"
              fill={T.ink}
            >
              {sys.name}
            </text>
            <text
              x={sys.x}
              y={sys.y + 27}
              textAnchor="middle"
              fontSize="9"
              fontFamily="Inter"
              fontWeight="700"
              fill={hColor}
              letterSpacing="1"
            >
              {severityLabel(sys.healthScore).toUpperCase()}
            </text>
            {/* Subtle expand affordance in the bottom-right corner of the node. */}
            <g
              transform={`translate(${sys.x + r * 0.62}, ${sys.y + r * 0.62})`}
              pointerEvents="none"
            >
              <circle
                r={10}
                fill={T.paper}
                stroke={sysColor}
                strokeWidth={1.5}
                strokeOpacity={0.9}
              />
              <path
                d="M -3 -3 L 3 0 L -3 3"
                fill="none"
                stroke={sysColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

          </g>
        );
      })}

      <g transform="translate(20, 460)">
        {[
          { color: T.sys.AUTH, label: "Strong (70+)" },
          { color: T.sys.VIS, label: "Stable (55-70)" },
          { color: T.sand, label: "Fragile (40-55)" },
          { color: "#EF4444", label: "Critical (<40)" },
        ].map((l, i) => (
          <g key={i} transform={`translate(${i * 160}, 0)`}>
            <circle cx="6" cy="6" r="5" fill={l.color} opacity="0.7" />
            <text x="16" y="10" fontSize="9" fontFamily="Inter" fill={T.mid}>
              {l.label}
            </text>
          </g>
        ))}
        <g transform="translate(640, 0)">
          <line
            x1="0"
            y1="6"
            x2="20"
            y2="6"
            stroke={T.sand}
            strokeWidth="2"
            strokeDasharray="4,3"
          />
          <text x="26" y="10" fontSize="9" fontFamily="Inter" fill={T.mid}>
            Strained connection
          </text>
        </g>
      </g>
    </svg>
  );
}

function ZoomedSystem({
  payload,
  systemCode,
  isStarter,
  onBack,
}: {
  payload: MatrixMapData;
  systemCode: string;
  isStarter: boolean;
  onBack: (e: React.MouseEvent) => void;
}) {
  const sys = payload.parents.find((p) => p.code === systemCode)!;
  const children = payload.childrenByParent[systemCode] ?? [];
  const conn = payload.systemConnections[systemCode] ?? { upstream: [], downstream: [] };
  const sysColor = T.sys[sys.code];
  const [selectedChildCode, setSelectedChildCode] = useState<string | null>(null);
  const child = children.find((c) => c.code === selectedChildCode);
  const unassessedCount = children.filter((c) => !c.assessed).length;
  const assessedCount = children.filter((c) => c.assessed).length;
  const displayName = /\bSystem$/i.test(sys.name) ? sys.name : `${sys.name} System`;

  return (
    <div>
      {/* Big center system node — doubles as the zoom-out control. */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <button
          onClick={onBack}
          aria-label={`Zoom out from ${displayName}`}
          title="Click to zoom out"
          style={{
            width: 168,
            height: 168,
            borderRadius: "50%",
            border: `3px solid ${sysColor}`,
            background: `radial-gradient(circle at 50% 40%, ${sysColor}22, ${sysColor}08)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            cursor: "pointer",
            fontFamily: "Inter",
            textAlign: "center",
            boxShadow: `0 6px 24px ${sysColor}22`,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontFamily: "Inter",
              fontWeight: 700,
              color: sysColor,
              lineHeight: 1,
            }}
          >
            {sys.healthScore}
          </div>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 20,
              fontWeight: 400,
              color: T.ink,
              marginTop: 6,
              lineHeight: 1.15,
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: 9,
              fontFamily: "Inter",
              fontWeight: 700,
              color: T.mid,
              letterSpacing: "0.08em",
              marginTop: 8,
            }}
          >
            ← CLICK TO ZOOM OUT
          </div>
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
              {isStarter && unassessedCount > 0
                ? `Click any subsystem to explore · ${unassessedCount} locked, assessed ${assessedCount} of ${children.length}`
                : "Click any subsystem to explore"}
            </span>
          </div>



          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
            }}
          >
            {children.map((c) => {
              const hc = healthColor(c.healthScore);
              const isSelected = selectedChildCode === c.code;
              const isLocked = isStarter && !c.assessed;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildCode(isSelected ? null : c.code)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `2px solid ${
                      isSelected
                        ? sysColor
                        : c.assessed
                          ? hc + "60"
                          : "rgba(0,0,0,0.1)"
                    }`,
                    background: isSelected
                      ? sysColor + "12"
                      : c.assessed
                        ? hc + "08"
                        : T.offWhite,
                    position: "relative",
                    transition: "all 0.15s",
                    opacity: isLocked ? 0.7 : 1,
                    textAlign: "left",
                  }}
                >
                  {isLocked && (
                    <div style={{ position: "absolute", top: 4, right: 4, fontSize: 10 }}>
                      🔒
                    </div>
                  )}
                  {!c.assessed && !isStarter && (
                    <div
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        fontSize: 8,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.mid,
                        background: T.white,
                        padding: "1px 4px",
                        borderRadius: 4,
                      }}
                    >
                      EST
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: c.assessed ? hc : T.mid,
                      marginBottom: 4,
                    }}
                  >
                    {c.healthScore}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 600,
                      color: T.ink,
                      lineHeight: 1.3,
                    }}
                  >
                    {c.name}
                  </div>
                  {c.assessed && (c.isHardShadow || c.isSoftShadow) && (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        fontSize: 8,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: T.sand,
                        background: "rgba(196,149,106,0.15)",
                        padding: "1px 5px",
                        borderRadius: 8,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {c.isHardShadow ? "HARD SHADOW" : "SHADOW"}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "Inter",
                      color: T.mid,
                      marginTop: 2,
                    }}
                  >
                    {isLocked
                      ? "not assessed"
                      : !c.assessed
                        ? "illustrative"
                        : `tracking ${c.trackingScore}`}
                  </div>
                </button>
              );
            })}
          </div>

          {isStarter && unassessedCount > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 16px",
                background: "rgba(240,82,35,0.05)",
                border: "1px solid rgba(240,82,35,0.2)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
                {unassessedCount} subsystems locked — upgrade to assess all{" "}
                {children.length}
              </span>
              <button
                style={{
                  background: T.ember,
                  color: T.white,
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontFamily: "Inter",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Unlock all {children.length}
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            background: T.white,
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
          }}
        >
          {child ? (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  color: sysColor,
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                {sys.name.toUpperCase()} SYSTEM
              </div>
              <h4
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 8px",
                }}
              >
                {child.name}
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: healthColor(child.healthScore) + "18",
                    color: healthColor(child.healthScore),
                    fontSize: 11,
                    fontFamily: "Inter",
                    fontWeight: 600,
                  }}
                >
                  {severityLabel(child.healthScore)} · {child.healthScore}/100
                </div>
                {child.assessed && (child.isHardShadow || child.isSoftShadow) && (
                  <div
                    style={{
                      display: "inline-flex",
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: "rgba(196,149,106,0.15)",
                      color: T.sand,
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {child.isHardShadow ? "HARD SHADOW RISK" : "SHADOW RISK"}
                  </div>
                )}
                {child.assessed && (
                  <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>
                    Tracking {child.trackingScore}/100
                  </div>
                )}
              </div>
              {!child.assessed && (
                <div
                  style={{
                    background: "rgba(240,82,35,0.06)",
                    border: "1px solid rgba(240,82,35,0.2)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 14,
                    fontSize: 11,
                    fontFamily: "Inter",
                    color: T.ember,
                    lineHeight: 1.5,
                  }}
                >
                  {isStarter
                    ? "Not assessed — upgrade to Revenue Health Assessment™ to evaluate this subsystem."
                    : "Illustrative — not evaluated in your Health Check. Select it next quarter for real data."}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  fontFamily: "Inter",
                  color: T.mid,
                  lineHeight: 1.65,
                }}
              >
                {child.assessed && (child.isHardShadow || child.isSoftShadow)
                  ? `Health looks ${severityLabel(child.healthScore).toLowerCase()} on the surface, but tracking is only ${child.trackingScore}/100 — a ${child.healthScore - child.trackingScore}-point visibility gap. You may be running on undocumented, founder-held knowledge that won't survive scale or turnover.`
                  : child.coreSymptom ||
                    'Click "View in Top Opportunities" to see improvement potential and cascade impacts.'}
              </div>
              <Link
                to="/reports/top-opportunities"
                style={{
                  marginTop: 14,
                  display: "block",
                  textAlign: "center",
                  background: "transparent",
                  border: `1px solid ${sysColor}`,
                  color: sysColor,
                  borderRadius: 8,
                  padding: "9px",
                  fontFamily: "Inter",
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                View in Top Opportunities →
              </Link>
            </>
          ) : (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>○</div>
              <p
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: T.mid,
                  lineHeight: 1.6,
                }}
              >
                Click any subsystem to explore its health score and improvement
                opportunities.
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ConnPanel
          title="UPSTREAM INFLUENCES"
          intro={`Systems that feed into ${sys.name} — weaknesses here limit what this system can achieve.`}
          items={conn.upstream}
          accent={sysColor}
          variant="upstream"
        />
        <ConnPanel
          title="DOWNSTREAM EFFECTS"
          intro={`Systems affected when ${sys.name} is weak — problems here often originate upstream.`}
          items={conn.downstream}
          accent={sysColor}
          variant="downstream"
        />
      </div>
    </div>
  );
}

function ConnPanel({
  title,
  intro,
  items,
  accent,
  variant,
}: {
  title: string;
  intro: string;
  items: MatrixSysConnItem[];
  accent: string;
  variant: "upstream" | "downstream";
}) {
  return (
    <div
      style={{
        background: T.white,
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 2px 8px rgba(24,40,41,0.04)",
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
        {title}
      </div>
      <div
        style={{
          fontSize: 11,
          fontFamily: "Inter",
          color: T.mid,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        {intro}
      </div>
      {items.map((item, i) => {
        const bg =
          item.type === "strong"
            ? variant === "downstream"
              ? "#EF444408"
              : accent + "08"
            : T.offWhite;
        const border =
          item.type === "strong"
            ? variant === "downstream"
              ? "#EF444430"
              : accent + "30"
            : item.type === "moderate"
              ? T.sand + "40"
              : "rgba(0,0,0,0.06)";
        return (
          <div
            key={i}
            style={{
              padding: "12px 14px",
              marginBottom: 10,
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
                flexWrap: "wrap",
              }}
            >
              {item.score !== null && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: healthColor(item.score) + "20",
                    border: `2px solid ${healthColor(item.score)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter",
                      fontWeight: 700,
                      color: healthColor(item.score),
                    }}
                  >
                    {item.score}
                  </span>
                </div>
              )}
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "Inter",
                  fontWeight: 600,
                  color: T.ink,
                }}
              >
                {item.name}
              </span>
              {variant === "downstream" && item.type === "strong" && (
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: "#EF4444",
                    background: "#EF444415",
                    padding: "1px 6px",
                    borderRadius: 8,
                  }}
                >
                  HIGH IMPACT
                </span>
              )}
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
              {item.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SimulatorTab({
  scenarios,
  selectedSet,
  expanded,
  onToggle,
}: {
  scenarios: MatrixScenario[];
  selectedSet: Set<string>;
  expanded: string | null;
  onToggle: (code: string) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {scenarios.map((sc, i) => {
          const isExpanded = expanded === sc.code;
          const illustrative = !selectedSet.has(sc.childSystemId);
          return (
            <ScenarioCard
              key={sc.childSystemId}
              scenario={sc}
              rank={i + 1}
              illustrative={illustrative}
              expanded={isExpanded}
              onToggle={() => onToggle(sc.code)}
            />
          );
        })}
      </div>
      <div
        style={{
          marginTop: 24,
          padding: "12px 16px",
          background: T.offWhite,
          borderRadius: 10,
          fontSize: 11,
          fontFamily: "Inter",
          color: T.mid,
          lineHeight: 1.6,
        }}
      >
        Scenarios model likely operational system responses based on framework relationships.
        They are not financial forecasts and do not guarantee specific revenue outcomes.
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  rank,
  illustrative,
  expanded,
  onToggle,
}: {
  scenario: MatrixScenario;
  rank: number;
  illustrative: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = T.sys[scenario.parentCode] ?? T.teal;
  const leverageColor =
    scenario.leverage === "critical"
      ? "#EF4444"
      : scenario.leverage === "high"
        ? T.sand
        : T.mid;
  const confColor =
    scenario.confidenceScore >= 80
      ? T.sys.AUTH
      : scenario.confidenceScore >= 65
        ? T.sys.VIS
        : T.sand;

  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${expanded ? color + "40" : "rgba(0,0,0,0.07)"}`,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        boxShadow: expanded
          ? `0 4px 16px ${color}10`
          : "0 2px 6px rgba(24,40,41,0.04)",
        opacity: illustrative && !expanded ? 0.85 : 1,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "44px 1fr auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          background: expanded ? color + "06" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          borderBottom: expanded ? `1px solid ${T.offWhite}` : "none",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: expanded ? color : T.offWhite,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontFamily: "Inter",
              fontWeight: 700,
              color: expanded ? T.white : T.mid,
            }}
          >
            {rank}
          </span>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: color,
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontFamily: "Inter",
                fontWeight: 600,
                color: T.ink,
              }}
            >
              {scenario.title}
            </span>
            <span style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>
              {scenario.parentName}
            </span>
            {illustrative && (
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  color: T.sand,
                  background: "rgba(196,149,106,0.15)",
                  padding: "1px 6px",
                  borderRadius: 8,
                  letterSpacing: "0.04em",
                }}
              >
                *ILLUSTRATIVE
              </span>
            )}
          </div>
          {!expanded && (
            <p
              style={{
                fontSize: 11,
                fontFamily: "Inter",
                color: T.mid,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {scenario.description.length > 90
                ? scenario.description.substring(0, 90) + "…"
                : scenario.description}
            </p>
          )}
        </div>

        <div
          style={{
            padding: "3px 10px",
            borderRadius: 20,
            background: leverageColor + "18",
            color: leverageColor,
            fontSize: 10,
            fontFamily: "Inter",
            fontWeight: 700,
            whiteSpace: "nowrap",
            textTransform: "uppercase",
          }}
        >
          {scenario.leverage} leverage
        </div>

        <div style={{ position: "relative", width: 48, height: 48 }}>
          <svg width="48" height="48" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="24" cy="24" r="18" fill="none" stroke={T.offWhite} strokeWidth="4" />
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke={illustrative ? T.mid : confColor}
              strokeWidth="4"
              strokeDasharray={`${(scenario.confidenceScore / 100) * 113} 113`}
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontFamily: "Inter",
                fontWeight: 700,
                color: T.ink,
              }}
            >
              {scenario.confidenceScore}%
            </span>
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
          {illustrative && (
            <div
              style={{
                background: "rgba(196,149,106,0.08)",
                border: "1px solid rgba(196,149,106,0.25)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                fontFamily: "Inter",
                color: T.mid,
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 600, color: T.ink }}>*Illustrative scenario — </span>
              {scenario.name} was not evaluated in your Health Check. This scenario is based on
              framework data, not your actual scores. Select this subsystem in your next
              quarterly Health Check to see personalised projections.
            </div>
          )}

          <p
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: T.ink,
              lineHeight: 1.65,
              marginBottom: 20,
            }}
          >
            {scenario.description}
          </p>

          {scenario.improvements.length > 0 && (
            <div
              style={{
                background: T.offWhite,
                borderRadius: 10,
                padding: "16px 18px",
                marginBottom: 16,
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
                WHAT LIKELY IMPROVES DOWNSTREAM
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {scenario.improvements.map((imp, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          imp.impact === "High" ? color + "25" : T.white,
                        border: `1.5px solid ${imp.impact === "High" ? color : "rgba(0,0,0,0.1)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color: imp.impact === "High" ? color : T.mid,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter",
                          fontWeight: 600,
                          color: T.ink,
                        }}
                      >
                        {imp.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: "Inter",
                          color: T.mid,
                          lineHeight: 1.4,
                        }}
                      >
                        {imp.impact} impact — {imp.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <MetaTile label="EFFORT" value={scenario.effortLevel} />
            <MetaTile label="TIMEFRAME" value={scenario.timeframe} />
            <MetaTile
              label="CONFIDENCE"
              value={`${scenario.confidenceScore}%`}
              color={confColor}
            />
          </div>

          <div
            style={{
              background: "rgba(42,107,110,0.06)",
              border: "1px solid rgba(42,107,110,0.18)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 11,
              fontFamily: "Inter",
              color: T.mid,
              lineHeight: 1.6,
            }}
          >
            <span style={{ fontWeight: 600, color: T.ink }}>Stabilisation note: </span>
            {scenario.stabilisationNote}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.offWhite}`,
        borderRadius: 8,
        padding: 12,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: "Inter",
          fontWeight: 700,
          color: T.mid,
          letterSpacing: "0.1em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontFamily: "Inter",
          fontWeight: 600,
          color: color ?? T.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}
