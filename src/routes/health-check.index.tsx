import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  getHealthCheckData,
  saveResponse,
  type HealthCheckData,
  type ChildSystem,
  type Area,
} from "@/lib/healthcheck.functions";

export const Route = createFileRoute("/health-check/")({
  head: () => ({ meta: [{ title: "Health Check — Revenue Health Visualiser" }] }),
  component: HealthCheckPage,
});

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  teal: "#2A6B6E",
  tealBright: "#4ABFC4",
  mid: "#888880",
  ink: "#111111",
  white: "#FFFFFF",
};

const HEALTH_LABELS = ["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"];
const TRACKING_LABELS = [
  "Not documented — runs on instinct",
  "Someone knows but nothing is written down",
  "We look at this occasionally, not consistently",
  "We track this regularly with real data",
  "Documented, measured, reviewed on a set cadence",
];

type ResponseMap = Record<string, { health: number | null; tracking: number | null }>;

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 3, background: T.offWhite, borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

function HealthCheckPage() {
  const fetchData = useServerFn(getHealthCheckData);
  const saveFn = useServerFn(saveResponse);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["health-check"],
    queryFn: () => fetchData(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center" style={{ background: T.paper }}>
        <p className="text-sm" style={{ color: T.mid }}>Loading your Health Check…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-sm" style={{ color: T.ember }}>
        Failed to load: {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  return <HealthCheckShell data={data} saveFn={saveFn} qc={qc} />;
}

function HealthCheckShell({
  data,
  saveFn,
  qc,
}: {
  data: HealthCheckData;
  saveFn: ReturnType<typeof useServerFn<typeof saveResponse>>;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { tier, assessment, parents, children, areas } = data;

  // Build a response map keyed by question_id
  const initialResponses = useMemo<ResponseMap>(() => {
    const m: ResponseMap = {};
    for (const r of data.responses) {
      m[r.question_id] = {
        health: r.health_response,
        tracking: r.tracking_response,
      };
    }
    return m;
  }, [data.responses]);

  const [responses, setResponses] = useState<ResponseMap>(initialResponses);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [completedBanner, setCompletedBanner] = useState(
    assessment.status === "completed",
  );

  const childrenByParent = useMemo(() => {
    const m = new Map<string, ChildSystem[]>();
    for (const c of children) {
      const arr = m.get(c.parent_system_id) ?? [];
      arr.push(c);
      m.set(c.parent_system_id, arr);
    }
    for (const v of m.values()) v.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [children]);

  const areasByChild = useMemo(() => {
    const m = new Map<string, Area[]>();
    for (const a of areas) {
      const arr = m.get(a.child_system_id) ?? [];
      arr.push(a);
      m.set(a.child_system_id, arr);
    }
    for (const v of m.values()) v.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [areas]);

  // pre-select first parent, first unlocked child
  const firstParent = parents[0];
  const initialChild = useMemo(() => {
    if (!firstParent) return null;
    const list = childrenByParent.get(firstParent.id) ?? [];
    return list.find((c) => c.access_tier === "free" || tier !== "starter") ?? list[0];
  }, [firstParent, childrenByParent, tier]);

  const [activeParentId, setActiveParentId] = useState<string | null>(
    firstParent?.id ?? null,
  );
  const [activeChildId, setActiveChildId] = useState<string | null>(
    initialChild?.id ?? null,
  );

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isChildLocked = useCallback(
    (c: ChildSystem) => c.access_tier === "paid" && tier === "starter",
    [tier],
  );

  // Overall completion
  const totalUnlocked = data.totalUnlockedAreas;
  const completedCount = useMemo(() => {
    const unlockedChildIds = new Set(
      children.filter((c) => !isChildLocked(c)).map((c) => c.id),
    );
    return areas.filter((a) => {
      if (!unlockedChildIds.has(a.child_system_id)) return false;
      const r = responses[a.question_id];
      return r && r.health !== null && r.tracking !== null;
    }).length;
  }, [areas, children, responses, isChildLocked]);
  const completionPct = totalUnlocked
    ? Math.round((completedCount / totalUnlocked) * 100)
    : 0;

  // Save helper (debounced per question)
  const persist = useCallback(
    (questionId: string, health: number | null, tracking: number | null) => {
      setSaveState("saving");
      if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId]);
      saveTimers.current[questionId] = setTimeout(async () => {
        try {
          const res = await saveFn({
            data: {
              assessment_id: assessment.id,
              question_id: questionId,
              health_response: health,
              tracking_response: tracking,
            },
          });
          setSaveState("saved");
          if (res?.completed) {
            setCompletedBanner(true);
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }
        } catch (e) {
          setSaveState("idle");
          console.error(e);
        }
      }, 2000);
    },
    [assessment.id, saveFn, qc],
  );

  function setHealth(area: Area, value: number) {
    setResponses((prev) => {
      const cur = prev[area.question_id] ?? { health: null, tracking: null };
      const next = { ...cur, health: value };
      persist(area.question_id, next.health, next.tracking);
      return { ...prev, [area.question_id]: next };
    });
    if (value === -1) {
      setTimeout(() => advanceToNext(area), 300);
    }
  }

  function setTracking(area: Area, value: number) {
    setResponses((prev) => {
      const cur = prev[area.question_id] ?? { health: null, tracking: null };
      const next = { ...cur, tracking: value };
      persist(area.question_id, next.health, next.tracking);
      return { ...prev, [area.question_id]: next };
    });
    setTimeout(() => advanceToNext(area), 400);
  }

  function advanceToNext(area: Area) {
    const list = areasByChild.get(area.child_system_id) ?? [];
    const idx = list.findIndex((a) => a.id === area.id);
    const next = list.slice(idx + 1).find((a) => {
      const r = responses[a.question_id];
      return !r || r.health === null || r.health === 0;
    });
    if (next) {
      const el = cardRefs.current[next.question_id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const skipped = list.filter((a) => responses[a.question_id]?.health === -1);
      if (skipped.length > 0) setShowSkipWarning(true);
    }
  }

  const activeParent = parents.find((p) => p.id === activeParentId) ?? parents[0];
  const activeChildren = activeParent ? childrenByParent.get(activeParent.id) ?? [] : [];
  const activeChild =
    activeChildren.find((c) => c.id === activeChildId) ??
    activeChildren.find((c) => !isChildLocked(c)) ??
    activeChildren[0];
  const activeAreas = activeChild ? areasByChild.get(activeChild.id) ?? [] : [];
  const systemColor = activeParent?.color_hex ? `#${activeParent.color_hex}` : T.teal;

  const childComplete =
    activeChild &&
    activeAreas.length > 0 &&
    activeAreas.every((a) => {
      const r = responses[a.question_id];
      return r && r.health !== null && r.health > 0 && r.tracking !== null;
    });
  const childSkippedCount = activeAreas.filter(
    (a) => responses[a.question_id]?.health === -1,
  ).length;

  function selectChild(c: ChildSystem) {
    if (isChildLocked(c)) return;
    setShowSkipWarning(false);
    setActiveChildId(c.id);
  }

  function selectParent(pid: string) {
    setActiveParentId(pid);
    const list = childrenByParent.get(pid) ?? [];
    const first = list.find((c) => !isChildLocked(c)) ?? list[0];
    if (first) setActiveChildId(first.id);
    setShowSkipWarning(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: T.paper,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          background: T.paper,
          borderBottom: `1px solid ${T.offWhite}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
          <span
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 17,
              color: T.ink,
            }}
          >
            Health Check
          </span>
          <div style={{ width: 200 }}>
            <ProgressBar pct={completionPct} color={T.tealBright} />
          </div>
          <span style={{ fontSize: 11, color: T.mid }}>{completionPct}% complete</span>
        </div>
        <div>
          {saveState === "saving" && (
            <span style={{ fontSize: 11, color: T.mid }}>Saving…</span>
          )}
          {saveState === "saved" && (
            <span style={{ fontSize: 11, color: T.teal }}>✓ Saved</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left nav */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: `1px solid ${T.offWhite}`,
            overflowY: "auto",
            paddingTop: 8,
          }}
        >
          {parents.map((p) => {
            const list = childrenByParent.get(p.id) ?? [];
            const totalAreas = list.reduce(
              (s, c) => s + (areasByChild.get(c.id)?.length ?? 0),
              0,
            );
            const doneAreas = list.reduce((s, c) => {
              const arr = areasByChild.get(c.id) ?? [];
              return (
                s +
                arr.filter((a) => {
                  const r = responses[a.question_id];
                  return r && r.health !== null && r.health > 0 && r.tracking !== null;
                }).length
              );
            }, 0);
            const pct = totalAreas ? Math.round((doneAreas / totalAreas) * 100) : 0;
            const isActiveParent = p.id === activeParent?.id;
            const color = `#${p.color_hex}`;

            return (
              <div key={p.id}>
                <button
                  onClick={() => selectParent(p.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    background: isActiveParent ? `${color}10` : "none",
                    border: "none",
                    borderLeft: `3px solid ${isActiveParent ? color : "transparent"}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActiveParent ? color : T.ink,
                      }}
                    >
                      {p.name}
                    </div>
                    {pct > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <ProgressBar pct={pct} color={color} />
                      </div>
                    )}
                  </div>
                  {pct > 0 && (
                    <span style={{ fontSize: 10, color: T.mid }}>{pct}%</span>
                  )}
                </button>

                {isActiveParent &&
                  list.map((c) => {
                    const locked = isChildLocked(c);
                    const arr = areasByChild.get(c.id) ?? [];
                    const complete =
                      arr.length > 0 &&
                      arr.every((a) => {
                        const r = responses[a.question_id];
                        return (
                          r &&
                          r.health !== null &&
                          r.health > 0 &&
                          r.tracking !== null
                        );
                      });
                    const hasSkipped = arr.some(
                      (a) => responses[a.question_id]?.health === -1,
                    );
                    const isActive = c.id === activeChild?.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => selectChild(c)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 16px 7px 34px",
                          background: isActive ? `${color}08` : "none",
                          border: "none",
                          borderLeft: `3px solid ${
                            isActive ? color : "transparent"
                          }`,
                          cursor: locked ? "not-allowed" : "pointer",
                          opacity: locked ? 0.45 : 1,
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 11, width: 14, flexShrink: 0 }}>
                          {locked ? "🔒" : complete ? "✓" : hasSkipped ? "○" : ""}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 500 : 400,
                            color: complete ? T.teal : isActive ? color : T.mid,
                          }}
                        >
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {completedBanner && (
            <div
              style={{
                background: `${T.tealBright}15`,
                border: `1px solid ${T.tealBright}40`,
                borderRadius: 10,
                padding: "14px 18px",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: T.ink }}>
                Your Revenue Health Check is complete.
              </span>
              <a
                href="/report"
                style={{
                  background: T.ember,
                  color: T.white,
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View your Report →
              </a>
            </div>
          )}

          {activeParent && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: 20,
                  color: systemColor,
                  marginBottom: 8,
                }}
              >
                {activeParent.name}
              </div>
              {/* Chips */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {activeChildren.map((c) => {
                  const locked = isChildLocked(c);
                  const arr = areasByChild.get(c.id) ?? [];
                  const complete =
                    arr.length > 0 &&
                    arr.every((a) => {
                      const r = responses[a.question_id];
                      return (
                        r &&
                        r.health !== null &&
                        r.health > 0 &&
                        r.tracking !== null
                      );
                    });
                  const hasSkipped = arr.some(
                    (a) => responses[a.question_id]?.health === -1,
                  );
                  const active = c.id === activeChild?.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectChild(c)}
                      disabled={locked}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: `1.5px solid ${
                          locked
                            ? "rgba(0,0,0,0.08)"
                            : active
                            ? systemColor
                            : complete
                            ? `${T.tealBright}60`
                            : "rgba(0,0,0,0.1)"
                        }`,
                        background: active
                          ? `${systemColor}15`
                          : complete
                          ? `${T.tealBright}10`
                          : T.white,
                        color: locked
                          ? T.mid
                          : active
                          ? systemColor
                          : complete
                          ? T.teal
                          : T.ink,
                        fontSize: 12,
                        fontWeight: active ? 600 : 400,
                        cursor: locked ? "not-allowed" : "pointer",
                        opacity: locked ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {locked && <span style={{ fontSize: 10 }}>🔒</span>}
                      {complete && !locked && (
                        <span style={{ fontSize: 10, color: T.tealBright }}>✓</span>
                      )}
                      {hasSkipped && !complete && !locked && (
                        <span style={{ fontSize: 10, color: T.mid }}>○</span>
                      )}
                      {c.name}
                    </button>
                  );
                })}
              </div>

              {activeChild && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: T.ink,
                        marginBottom: 2,
                      }}
                    >
                      {activeChild.name}
                    </h2>
                    <p style={{ fontSize: 12, color: T.mid }}>
                      {activeAreas.length} areas · each has a health score and a
                      tracking question
                    </p>
                  </div>
                  {childComplete && (
                    <div
                      style={{
                        background: `${T.tealBright}20`,
                        border: `1px solid ${T.tealBright}40`,
                        borderRadius: 20,
                        padding: "4px 14px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.teal,
                      }}
                    >
                      ✓ Complete
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Locked or cards */}
          {activeChild && isChildLocked(activeChild) ? (
            <div
              style={{
                background: T.white,
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                minHeight: 200,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 12,
                  backdropFilter: "blur(4px)",
                  background: `${T.teal}08`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 28 }}>🔒</div>
                <p style={{ fontSize: 14, color: T.teal, fontWeight: 500 }}>
                  {activeChild.name} is available in Revenue Health Assessment™
                </p>
                <a
                  href="/upgrade"
                  style={{
                    background: T.ember,
                    color: T.white,
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Unlock all 50 subsystems →
                </a>
              </div>
            </div>
          ) : (
            <>
              {activeAreas.map((area) => {
                const r = responses[area.question_id] ?? {
                  health: null,
                  tracking: null,
                };
                const isSkipped = r.health === -1;
                const isComplete =
                  r.health !== null && r.health > 0 && r.tracking !== null;
                return (
                  <div
                    key={area.id}
                    ref={(el) => {
                      cardRefs.current[area.question_id] = el;
                    }}
                    style={{
                      background: T.white,
                      border: `1px solid ${
                        isComplete ? `${T.tealBright}50` : "rgba(0,0,0,0.08)"
                      }`,
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 14,
                      position: "relative",
                    }}
                  >
                    {isComplete && (
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: T.tealBright,
                          color: T.white,
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ✓
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: systemColor,
                        fontWeight: 600,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {area.name}
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        color: T.ink,
                        lineHeight: 1.5,
                        marginBottom: area.helper_text ? 10 : 14,
                      }}
                    >
                      {area.question_text}
                    </p>
                    {area.helper_text && (
                      <div
                        style={{
                          borderLeft: `2px solid ${T.offWhite}`,
                          paddingLeft: 10,
                          marginBottom: 14,
                          fontSize: 12,
                          color: T.mid,
                          lineHeight: 1.5,
                        }}
                      >
                        {area.helper_text}
                      </div>
                    )}

                    {/* Health 4-button scale */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      {HEALTH_LABELS.map((label, i) => {
                        const val = i + 1;
                        const sel = r.health === val;
                        return (
                          <button
                            key={val}
                            onClick={() => setHealth(area, val)}
                            style={{
                              padding: "10px 8px",
                              border: `1px solid ${
                                sel ? systemColor : "rgba(0,0,0,0.1)"
                              }`,
                              background: sel ? `${systemColor}15` : T.white,
                              color: sel ? systemColor : T.ink,
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: sel ? 600 : 400,
                              cursor: "pointer",
                              textAlign: "center",
                              lineHeight: 1.3,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setHealth(area, -1)}
                      style={{
                        background: "none",
                        border: "none",
                        color: isSkipped ? T.ember : T.mid,
                        fontSize: 11,
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: "4px 0",
                      }}
                    >
                      {isSkipped ? "Skipped" : "Not sure, skip for now"}
                    </button>

                    {/* Tracking — only after health is selected (not skipped) */}
                    {r.health !== null && r.health > 0 && (
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: `1px solid ${T.offWhite}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.ink,
                            marginBottom: 10,
                          }}
                        >
                          How is this tracked in your business?
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {TRACKING_LABELS.map((label, i) => {
                            const val = i + 1;
                            const sel = r.tracking === val;
                            return (
                              <label
                                key={val}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${
                                    sel ? systemColor : "rgba(0,0,0,0.08)"
                                  }`,
                                  background: sel ? `${systemColor}10` : T.white,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  color: sel ? systemColor : T.ink,
                                  fontWeight: sel ? 500 : 400,
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`track-${area.id}`}
                                  checked={sel}
                                  onChange={() => setTracking(area, val)}
                                  style={{ accentColor: systemColor }}
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {showSkipWarning && childSkippedCount > 0 && (
                <div
                  style={{
                    background: "rgba(240,82,35,0.06)",
                    border: "1px solid rgba(240,82,35,0.2)",
                    borderRadius: 10,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 13, color: T.ink }}>
                    You skipped {childSkippedCount} question
                    {childSkippedCount > 1 ? "s" : ""} — stay here or continue?
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setShowSkipWarning(false)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${T.ember}`,
                        color: T.ember,
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Stay
                    </button>
                    <button
                      onClick={() => {
                        setShowSkipWarning(false);
                        // jump to next unlocked child within this parent, else next parent
                        const list = activeChildren;
                        const idx = list.findIndex((c) => c.id === activeChild?.id);
                        const next = list
                          .slice(idx + 1)
                          .find((c) => !isChildLocked(c));
                        if (next) {
                          setActiveChildId(next.id);
                        } else {
                          const pIdx = parents.findIndex(
                            (p) => p.id === activeParent?.id,
                          );
                          const nextParent = parents[pIdx + 1];
                          if (nextParent) selectParent(nextParent.id);
                        }
                      }}
                      style={{
                        background: T.ember,
                        border: "none",
                        color: T.white,
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
