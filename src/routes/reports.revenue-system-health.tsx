import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  getRevenueSystemHealth,
  generateReportNarrative,
  type RevenueSystemHealth,
  type SystemHealthSystem,
  type ChildSystemScore,
} from "@/lib/report.functions";

export const Route = createFileRoute("/reports/revenue-system-health")({
  head: () => ({ meta: [{ title: "Revenue System Health — Revenue Health Visualiser" }] }),
  component: Page,
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

// Deterministic illustrative scores for blurred child rows
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function illustrativeForChild(seed: string, code: string) {
  const h = hash(`${seed}:${code}`);
  const healthScore = 40 + (h % 45);
  const trackingScore = Math.max(15, healthScore - 10 - ((h >> 8) % 25));
  return { healthScore, trackingScore };
}

function severity(score: number) {
  if (score < 40) return { label: "Critical", color: T.danger, bg: "rgba(239,68,68,0.1)" };
  if (score < 60) return { label: "Fragile", color: T.sand, bg: "rgba(196,149,106,0.12)" };
  if (score < 75) return { label: "Stable", color: T.sys.AUTH, bg: "rgba(43,180,87,0.1)" };
  return { label: "Strong", color: T.tealBright, bg: "rgba(74,191,196,0.12)" };
}
const NOT_ASSESSED = { label: "Not assessed", color: T.mid, bg: "rgba(136,136,128,0.10)" };
function sevFor(child: ChildSystemScore & { illustrative?: boolean }) {
  if (child.severity === "not_assessed" && !(child as any).illustrative) return NOT_ASSESSED;
  return severity(child.healthScore);
}

function confidenceLabel(score: number) {
  if (score < 30) return "Very Low";
  if (score < 45) return "Low";
  if (score < 60) return "Moderate";
  return "High";
}

function ScoreRing({ score, size = 60, color }: { score: number; size?: number; color: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.offWhite} strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={T.ink}
        fontSize={size * 0.25}
        fontFamily="Inter"
        fontWeight={700}
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
      >
        {score}
      </text>
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
      a { text-decoration: none; }
      a:hover { text-decoration: underline; }
      button { transition: opacity 0.15s; }
      button:hover { opacity: 0.92; }
    `}</style>
  );
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
          Revenue System Health
        </span>
      </div>
    </div>
  );
}

// ─── Child row ──────────────────────────────────────────────────────────────
function ChildRow({
  child,
  systemColor,
  locked,
  isDiagnostic,
}: {
  child: ChildSystemScore & { illustrative?: boolean };
  systemColor: string;
  locked: boolean;
  isDiagnostic: boolean;
}) {
  const notAssessed = child.severity === "not_assessed" && !(child as any).illustrative;
  const sev = sevFor(child);
  const visGap = child.visibilityGap;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 52px 90px 180px 90px 80px",
        alignItems: "center",
        padding: "13px 20px",
        borderBottom: `1px solid ${T.offWhite}`,
        position: "relative",
        filter: locked ? "blur(3px)" : "none",
        userSelect: locked ? "none" : "auto",
        opacity: locked ? 0.7 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 500, color: T.ink }}>
          {child.name}
        </span>
        {visGap > 25 && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "Inter",
              fontWeight: 700,
              color: T.sand,
              background: "rgba(196,149,106,0.15)",
              padding: "1px 6px",
              borderRadius: 10,
              letterSpacing: "0.06em",
            }}
          >
            HIGH GAP
          </span>
        )}
        {child.isShadow && isDiagnostic && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "Inter",
              fontWeight: 700,
              color: T.sand,
              background: "rgba(196,149,106,0.15)",
              padding: "1px 6px",
              borderRadius: 10,
              letterSpacing: "0.06em",
            }}
          >
            SHADOW
          </span>
        )}
      </div>

      <div style={{ fontSize: 15, fontFamily: "Inter", fontWeight: 700, color: notAssessed ? T.mid : T.ink }}>
        {notAssessed ? "—" : child.healthScore}
      </div>

      <div
        style={{
          display: "inline-flex",
          padding: "2px 8px",
          borderRadius: 20,
          background: sev.bg,
          color: sev.color,
          fontSize: 10,
          fontFamily: "Inter",
          fontWeight: 600,
          width: "fit-content",
        }}
      >
        {sev.label}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {notAssessed ? (
          <span style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, fontStyle: "italic" }}>
            No responses recorded
          </span>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 5, flex: 1, background: T.offWhite, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${child.healthScore}%`, background: systemColor, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10, color: T.mid, fontFamily: "Inter", width: 28, textAlign: "right" }}>
                {child.healthScore}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 3, flex: 1, background: T.offWhite, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${child.trackingScore}%`, background: systemColor + "60", borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 10, color: T.mid, fontFamily: "Inter", width: 28, textAlign: "right" }}>
                {child.trackingScore}
              </span>
            </div>
          </>
        )}
      </div>

      <div>
        {notAssessed ? (
          <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>—</div>
        ) : (
          <>
            <div
              style={{
                fontSize: 12,
                fontFamily: "Inter",
                fontWeight: 600,
                color: visGap > 25 ? T.danger : visGap > 15 ? T.sand : T.sys.AUTH,
              }}
            >
              {visGap > 0 ? `+${visGap}` : visGap}
            </div>
            {visGap > 25 && !isDiagnostic && (
              <div style={{ fontSize: 10, fontFamily: "Inter", color: T.danger, marginTop: 2, lineHeight: 1.4, maxWidth: 90 }}>
                Investigate
              </div>
            )}
            {visGap > 25 && isDiagnostic && (
              <div style={{ fontSize: 10, fontFamily: "Inter", color: T.danger, marginTop: 2, lineHeight: 1.4, maxWidth: 90 }}>
                Shadow risk
              </div>
            )}
            {visGap > 15 && visGap <= 25 && (
              <div style={{ fontSize: 10, fontFamily: "Inter", color: T.sand, marginTop: 2, lineHeight: 1.4 }}>
                Watch
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>
        {notAssessed ? "—" : confidenceLabel(child.trackingScore)}
      </div>
    </div>
  );
}

// ─── System section ─────────────────────────────────────────────────────────
function SystemSection({
  system,
  tier,
  selectedIds,
  assessmentId,
  defaultOpen,
}: {
  system: SystemHealthSystem;
  tier: "starter" | "pro" | "diagnostic";
  selectedIds: Set<string>;
  assessmentId: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isStarter = tier === "starter";
  const isDiagnostic = tier === "diagnostic";
  const systemColor = T.sys[system.code] ?? system.color_hex;
  const parentNotAssessed = system.severity === "not_assessed";
  const sev = parentNotAssessed ? NOT_ASSESSED : severity(system.healthScore);
  const visGap = Math.round(system.healthScore - system.trackingScore);

  // Build child rows; for starter, non-selected children show illustrative blurred data.
  const childRows = system.children.map((c) => {
    const isAssessed = selectedIds.has(c.id) || c.assessed;
    const shouldBlur = isStarter && !isAssessed;
    if (shouldBlur) {
      const i = illustrativeForChild(assessmentId, c.code);
      const gap = i.healthScore - i.trackingScore;
      return {
        ...c,
        healthScore: i.healthScore,
        trackingScore: i.trackingScore,
        visibilityGap: gap,
        isShadow: i.healthScore >= 60 && i.trackingScore < 40,
        severity: severity(i.healthScore).label.toLowerCase() as ChildSystemScore["severity"],
        illustrative: true,
      };
    }
    return { ...c, illustrative: false };
  });

  const realChildren = childRows.filter((c) => !c.illustrative && c.severity !== "not_assessed");
  const weakest = (realChildren.length ? realChildren : childRows.filter((c) => c.severity !== "not_assessed"))
    .slice()
    .sort((a, b) => a.healthScore - b.healthScore)[0];

  const hasHighGapNonDiagnostic =
    !isDiagnostic && childRows.some((c) => c.visibilityGap > 25 && !c.illustrative);

  const lockedCount = childRows.filter((c) => c.illustrative).length;
  const visibleCount = childRows.length - lockedCount;

  const sortedChildRows = isStarter
    ? [...childRows].sort((a, b) => {
        const aAssessed = selectedIds.has(a.id);
        const bAssessed = selectedIds.has(b.id);
        if (aAssessed && !bAssessed) return -1;
        if (!aAssessed && bAssessed) return 1;
        return 0;
      })
    : childRows;

  return (
    <div
      style={{
        background: T.white,
        border: `1px solid rgba(0,0,0,0.07)`,
        borderRadius: 14,
        marginBottom: 20,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          alignItems: "center",
          gap: 20,
          padding: "20px 24px",
          background: open ? systemColor + "06" : "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: open ? `1px solid ${T.offWhite}` : "none",
          textAlign: "left",
        }}
      >
        <ScoreRing score={parentNotAssessed ? 0 : Math.round(system.healthScore)} size={60} color={parentNotAssessed ? T.mid : systemColor} />

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{ width: 8, height: 8, borderRadius: "50%", background: systemColor }}
            />
            <span
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 18,
                color: T.ink,
                fontWeight: 400,
              }}
            >
              {system.name}
            </span>
            <div
              style={{
                fontSize: 10,
                fontFamily: "Inter",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 20,
                background: sev.bg,
                color: sev.color,
              }}
            >
              {sev.label}
            </div>
          </div>
          {!open && system.narrative && (
            <p
              style={{
                fontSize: 12,
                fontFamily: "Inter",
                color: T.mid,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {system.narrative.substring(0, 110)}…
            </p>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 18,
              fontFamily: "Inter",
              fontWeight: 700,
              color: systemColor + "C0",
            }}
          >
            {Math.round(system.trackingScore)}
          </div>
          <div
            style={{ fontSize: 9, fontFamily: "Inter", color: T.mid, letterSpacing: "0.08em" }}
          >
            TRACKING
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 18,
              fontFamily: "Inter",
              fontWeight: 700,
              color: visGap > 20 ? T.sand : T.sys.AUTH,
            }}
          >
            {visGap > 0 ? `+${visGap}` : visGap}
          </div>
          <div
            style={{ fontSize: 9, fontFamily: "Inter", color: T.mid, letterSpacing: "0.08em" }}
          >
            VIS. GAP
          </div>
        </div>

        <span
          style={{
            fontSize: 14,
            color: T.mid,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div>
          {/* Narrative */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: `1px solid ${T.offWhite}`,
              background: systemColor + "08",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: "Inter",
                fontWeight: 700,
                color: systemColor,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              SYSTEM ANALYSIS
            </div>
            {system.narrative ? (
              <p
                style={{
                  fontSize: 13,
                  fontFamily: "Inter",
                  color: T.ink,
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                {system.narrative}
              </p>
            ) : null}
          </div>

          {/* Inline note about shadow systems for non-diagnostic with high gaps */}
          {hasHighGapNonDiagnostic && (
            <div
              style={{
                padding: "12px 24px",
                background: "rgba(196,149,106,0.06)",
                borderBottom: `1px solid ${T.offWhite}`,
                fontSize: 12,
                fontFamily: "Inter",
                color: T.mid,
                lineHeight: 1.6,
              }}
            >
              Large visibility gaps may indicate hidden system risks. Shadow system analysis
              is available in the Revenue Health Diagnostic™.
            </div>
          )}

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px 90px 180px 90px 80px",
              padding: "10px 20px",
              background: T.offWhite,
            }}
          >
            {["Subsystem", "Score", "Status", "Health / Tracking", "Gap", "Confidence"].map(
              (h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 9,
                    fontFamily: "Inter",
                    fontWeight: 700,
                    color: T.mid,
                    letterSpacing: "0.1em",
                  }}
                >
                  {h.toUpperCase()}
                </div>
              ),
            )}
          </div>

          <div style={{ position: "relative" }}>
            {sortedChildRows.map((c) => (
              <ChildRow
                key={c.id}
                child={c}
                systemColor={systemColor}
                locked={!!c.illustrative}
                isDiagnostic={isDiagnostic}
              />
            ))}

            {isStarter && lockedCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "55%",
                  background: `linear-gradient(to bottom, transparent, ${T.paper}dd, ${T.paper})`,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: 20,
                  pointerEvents: "none",
                }}
              >
                <div style={{ pointerEvents: "all", textAlign: "center" }}>
                  <p style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, marginBottom: 10 }}>
                    {lockedCount} subsystems locked — showing {visibleCount} of {childRows.length}
                  </p>
                  <a
                    href="https://marketplacemaven.com/upgrade"
                    style={{
                      background: T.ember,
                      color: T.white,
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 20px",
                      fontFamily: "Inter",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-block",
                    }}
                  >
                    Unlock all {childRows.length} subsystems →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: `1px solid ${T.offWhite}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
              {weakest && (
                <>
                  <span style={{ fontWeight: 600, color: T.ink }}>{weakest.name}</span> is the
                  weakest subsystem in this system.
                </>
              )}
            </div>
            <Link
              to="/reports/top-opportunities"
              style={{
                background: "transparent",
                border: `1px solid ${systemColor}`,
                color: systemColor,
                borderRadius: 6,
                padding: "6px 14px",
                fontFamily: "Inter",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              View in Top Opportunities →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────────────────
function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        marginBottom: 28,
        background: T.white,
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(24,40,41,0.04)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: T.offWhite,
          border: "none",
          cursor: "pointer",
          borderBottom: open ? `1px solid rgba(0,0,0,0.06)` : "none",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: "Inter",
            fontWeight: 700,
            color: T.mid,
            letterSpacing: "0.1em",
          }}
        >
          HOW TO READ THIS REPORT
        </span>
        <span
          style={{
            fontSize: 12,
            color: T.mid,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: "4px 0" }}>
          <LegendRow
            swatch={<div style={{ height: 6, width: 32, background: T.teal, borderRadius: 3 }} />}
            title="Health Score"
            body="How well you believe this capability is currently functioning in your business. Self-reported on a 1–4 scale, converted to 0–100. A high health score means you feel this system is working — it does not mean it is documented, measured, or resilient."
          />
          <LegendRow
            swatch={
              <div style={{ height: 3, width: 32, background: T.tealBright, borderRadius: 2 }} />
            }
            title="Tracking Score"
            body="How documented, measured, and visible this capability is in your business. High tracking means you can prove the system is working — you have data, process documentation, or consistent measurement. Low tracking means it runs on informal knowledge, instinct, or the memory of a key person."
          />
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 20,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: 160,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  color: T.sand,
                  background: "rgba(196,149,106,0.15)",
                  padding: "2px 8px",
                  borderRadius: 8,
                }}
              >
                +24
              </div>
              <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 700, color: T.ink }}>
                Visibility Gap
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 12,
                  fontFamily: "Inter",
                  color: T.mid,
                  lineHeight: 1.65,
                  margin: "0 0 10px",
                }}
              >
                Health minus Tracking. A large gap means your confidence in a system is ahead
                of your operational evidence for it — you believe it's working but can't prove
                it.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <GapTier color={T.sys.AUTH} label="Gap < 15" desc="Healthy. Confidence is grounded in operational evidence." />
                <GapTier color={T.sand} label="Gap 15–25" desc="Watch. Perception may be slightly ahead of reality." />
                <GapTier color={T.danger} label="Gap > 25" desc="Risk. Confidence is significantly ahead of evidence. This is a potential blind spot." />
              </div>
              <p style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 10, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: T.sand }}>Shadow System™:</span>{" "}
                a capability that scores high on health but low on tracking — appears
                functional but has no operational evidence. Surfaced in the Diagnostic tier.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendRow({
  swatch,
  title,
  body,
}: {
  swatch: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 20,
        padding: "16px 20px",
        borderBottom: `1px solid ${T.offWhite}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: 160,
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {swatch}
        <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 700, color: T.ink }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.65, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

function GapTier({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: "Inter",
        color: T.mid,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span>
        <span style={{ fontWeight: 600, color }}>{label}</span> — {desc}
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
function Page() {
  const fetchData = useServerFn(getRevenueSystemHealth);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["report", "revenue-system-health"],
    queryFn: () => fetchData({ data: {} }),
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
        <main style={{ maxWidth: 980, margin: "0 auto", padding: "36px 40px 80px" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={shellStyles}>
        <GlobalStyles />
        <TopBar />
        <main style={{ maxWidth: 980, margin: "0 auto", padding: "36px 40px 80px" }}>
          <div
            style={{
              background: T.white,
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 22,
                color: T.ink,
                margin: 0,
              }}
            >
              We couldn't load your report.
            </h2>
            <p style={{ fontSize: 13, color: T.mid, marginTop: 8 }}>
              {(error as Error).message}
            </p>
          </div>
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
        <main style={{ maxWidth: 980, margin: "0 auto", padding: "36px 40px 80px" }}>
          <div
            style={{
              background: T.white,
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 24,
                color: T.ink,
                margin: "0 0 10px",
              }}
            >
              Your Revenue System Health report unlocks once you finish your Health Check.
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
          </div>
        </main>
      </div>
    );
  }

  return <ReportBody data={data as RevenueSystemHealth} onNarrativeReady={() => refetch()} />;
}

function ReportBody({
  data,
  onNarrativeReady,
}: {
  data: RevenueSystemHealth;
  onNarrativeReady: () => void;
}) {
  const { tier, systems, assessment } = data;
  const selectedIds = new Set(assessment.selected_child_ids ?? []);

  const generate = useServerFn(generateReportNarrative);
  const triggered = useRef(false);
  const anyMissing = systems.some((s) => !s.narrative);
  useEffect(() => {
    if (anyMissing && !triggered.current) {
      triggered.current = true;
      generate({ data: { assessmentId: assessment.id } })
        .then(() => onNarrativeReady())
        .catch((e) => console.error("[system-health] narrative generation failed", e));
    }
  }, [anyMissing, assessment.id, generate, onNarrativeReady]);

  // Order systems POS, AUTH, CONV, LFC, VIS
  const order = ["POS", "AUTH", "CONV", "LFC", "VIS"];
  const ordered = [...systems].sort(
    (a, b) => order.indexOf(a.code) - order.indexOf(b.code),
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: T.paper,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <GlobalStyles />
      <TopBar />

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "36px 40px 80px" }}>
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
          REVENUE HEALTH MATRIX™ &nbsp;›&nbsp; REVENUE SYSTEM HEALTH
        </div>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            Revenue System Health
          </h1>
          <p
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: T.mid,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Each system is scored 0–100 across health (how well it functions) and tracking (how
            visible and documented it is). Click any system to expand the full subsystem breakdown.
          </p>
        </div>

        <Legend />

        {/* Self-assessment callout */}
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
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔍</span>
          <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>Self-assessment reminder: </span>
            These scores reflect your current perception of each system. Tracking scores are
            especially important — they reveal where your confidence may outpace your actual
            operational evidence.{" "}
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

        {/* System sections */}
        {ordered.map((s, i) => (
          <SystemSection
            key={s.id}
            system={s}
            tier={tier}
            selectedIds={selectedIds}
            assessmentId={assessment.id}
            defaultOpen={i === 0}
          />
        ))}

        {/* Footer */}
        <div
          style={{
            paddingTop: 24,
            borderTop: `1px solid ${T.offWhite}`,
            fontSize: 11,
            fontFamily: "Inter",
            color: T.mid,
            lineHeight: 1.65,
          }}
        >
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
