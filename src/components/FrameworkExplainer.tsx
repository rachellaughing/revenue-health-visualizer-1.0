import { useEffect, useState } from "react";
import type { ParentSystem, ChildSystem } from "@/lib/healthcheck.functions";

// Brand tokens (kept local to avoid coupling)
const C = {
  paper: "#FFFEFA",
  sand: "#F6F2EA",
  sandDeep: "#ECE6D9",
  ink: "#1A2828",
  inkSoft: "#6B6560",
  tealBright: "#22BDC1",
  tealLink: "#1F8A8A",
  abyss: "#16302E",
  abyssDeep: "#0F2321",
};

// Match the CSS variables set in styles.css.
const SYSTEM_COLORS: Record<string, string> = {
  Positioning: "#3B82F6",
  Authority: "#10B981",
  Conversion: "#E11D48",
  Lifecycle: "#8B5CF6",
  Visibility: "#F59E0B",
};

const ORDERED_SYSTEM_NAMES = [
  "Positioning",
  "Authority",
  "Conversion",
  "Lifecycle",
  "Visibility",
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 200ms ease",
        flexShrink: 0,
      }}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke={C.inkSoft}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type FrameworkExplainerProps = {
  context: "dashboard" | "healthcheck";
  defaultOpen?: boolean;
  parents: ParentSystem[];
  children: ChildSystem[];
  /** Codes of child systems the user has selected. Empty on paid tiers → treat all as covered. */
  selectedChildCodes: string[];
  tier: "starter" | "pro" | "diagnostic";
};

export function FrameworkExplainer({
  context,
  defaultOpen = false,
  parents,
  children,
  selectedChildCodes,
  tier,
}: FrameworkExplainerProps) {
  const storageKey = `fx-explainer-open:${context}`;
  const [open, setOpen] = useState<boolean>(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.sessionStorage.getItem(storageKey);
    if (v !== null) setOpen(v === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  // Group children by parent id, sorted by parent order then child order.
  const childrenByParent = new Map<string, ChildSystem[]>();
  for (const c of children) {
    const arr = childrenByParent.get(c.parent_system_id) ?? [];
    arr.push(c);
    childrenByParent.set(c.parent_system_id, arr);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }

  const sortedParents = [...parents].sort((a, b) => {
    const ai = ORDERED_SYSTEM_NAMES.indexOf(a.name);
    const bi = ORDERED_SYSTEM_NAMES.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    return a.sort_order - b.sort_order;
  });

  // Paid tiers evaluate everything; snapshot tier uses the user's selection.
  const allChildCodes = new Set(children.map((c) => c.code));
  const effectiveSelected =
    tier === "starter"
      ? new Set(selectedChildCodes)
      : allChildCodes;

  const totalSelected = effectiveSelected.size;
  const totalEvaluationAreas = totalSelected * 4;

  const dotColors = sortedParents.map(
    (p) => SYSTEM_COLORS[p.name] ?? `#${p.color_hex}`,
  );

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${C.sandDeep}`,
        background: C.paper,
      }}
    >
      {/* Collapsed bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: C.sand,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", flexShrink: 0 }}>
            {dotColors.map((c, i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: c,
                  marginLeft: i === 0 ? 0 : -2.5,
                  border: `1.5px solid ${C.sand}`,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 13.5,
              color: C.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Revenue Health Snapshot™ · {totalSelected} of 50 subsystems ·{" "}
            {totalEvaluationAreas} evaluation areas{" "}
            <span style={{ color: C.tealLink, fontWeight: 600, marginLeft: 6 }}>
              How it works
            </span>
          </span>
        </div>
        <Chevron open={open} />
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ background: C.abyss, padding: "24px 20px 20px" }}>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 22,
              color: C.paper,
              lineHeight: 1.25,
              marginBottom: 10,
            }}
          >
            A prompt didn't create the Revenue Health Matrix™.
          </div>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,254,250,0.65)",
              lineHeight: 1.6,
              margin: "0 0 16px",
            }}
          >
            Five interconnected systems, built from years of pattern recognition
            inside founder-led companies — not generated. Here's the shape of it,
            and what you're evaluating right now.
          </p>

          {/* Stat row */}
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 20,
              paddingBottom: 18,
              borderBottom: "1px solid rgba(255,254,250,0.12)",
            }}
          >
            {[
              { num: "5", label: "SYSTEMS", muted: false },
              {
                num: "10",
                label: "SUBSYSTEMS EACH",
                muted: true,
                annotation:
                  tier === "starter" ? "3 in your Snapshot" : null,
              },
              {
                num: "200",
                label: "EVALUATION AREAS",
                muted: true,
                annotation:
                  tier === "starter" ? "60 in your Snapshot" : null,
              },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  flex: 1,
                  borderLeft: i > 0 ? "1px solid rgba(255,254,250,0.12)" : "none",
                  paddingLeft: i > 0 ? 14 : 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 30,
                    color: item.muted
                      ? "rgba(255,254,250,0.5)"
                      : C.paper,
                    lineHeight: 1,
                  }}
                >
                  {item.num}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    color: "rgba(255,254,250,0.5)",
                    marginTop: 4,
                  }}
                >
                  {item.label}
                </div>
                {item.annotation && (
                  <div
                    style={{
                      fontSize: 9.5,
                      color: C.tealBright,
                      marginTop: 4,
                    }}
                  >
                    {item.annotation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Snapshot summary */}
          <div style={{ fontSize: 13, color: C.paper, marginBottom: 14 }}>
            {tier === "starter" ? (
              <>
                Your Snapshot™ covers <strong>{totalSelected} of 50</strong>{" "}
                subsystems — <strong>{totalEvaluationAreas} evaluation areas</strong>.
                The Snapshot covers 3 subsystems per system by design.
              </>
            ) : (
              <>
                You have access to all <strong>50 subsystems</strong> —{" "}
                <strong>200 evaluation areas</strong> across every system. The
                Snapshot tier covers 3 per system by design; your tier unlocks
                the rest.
              </>
            )}
          </div>

          {/* Per-system read-only grid */}
          {sortedParents.map((p) => {
            const color = SYSTEM_COLORS[p.name] ?? `#${p.color_hex}`;
            const list = childrenByParent.get(p.id) ?? [];
            const selectedInParent = list.filter((c) =>
              effectiveSelected.has(c.code),
            ).length;
            return (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 7,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                    <span
                      style={{ fontSize: 12.5, fontWeight: 600, color: C.paper }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "rgba(255,254,250,0.5)",
                    }}
                  >
                    {selectedInParent} of {list.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {list.map((c) => {
                    const chosen = effectiveSelected.has(c.code);
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          border: `1.3px solid ${
                            chosen ? color : "rgba(255,254,250,0.25)"
                          }`,
                          background: chosen ? color : "transparent",
                          color: chosen
                            ? C.abyssDeep
                            : "rgba(255,254,250,0.75)",
                          fontWeight: chosen ? 600 : 400,
                          userSelect: "none",
                        }}
                      >
                        {c.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FrameworkExplainer;
