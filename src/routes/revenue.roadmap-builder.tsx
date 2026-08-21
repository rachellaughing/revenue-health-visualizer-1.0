import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getRoadmap,
  setRoadmapInclusion,
  setRoadmapTasks,
  type RoadmapItem,
  type RoadmapHorizon,
} from "@/lib/report.functions";
import { useDiagnosticTierGate } from "@/components/reports/tier-gate";

export const Route = createFileRoute("/revenue/roadmap-builder")({
  head: () => ({ meta: [{ title: "Roadmap Builder — Revenue Health Visualiser™" }] }),
  component: Page,
});

export const T = {
  abyss: "var(--mm-abyss)", paper: "var(--mm-paper)", offWhite: "var(--mm-off-white)",
  ember: "var(--mm-ember)", teal: "var(--mm-teal)", tealBright: "var(--mm-teal-bright)",
  mid: "var(--mm-mid)", ink: "var(--mm-ink)", white: "var(--mm-white)",
  sys: { POS: "var(--mm-sys-positioning)", AUTH: "var(--mm-sys-authority)", CONV: "var(--mm-ember)", LFC: "var(--mm-sys-lifecycle)", VIS: "var(--mm-sys-visibility)" },
};

export const MAX_TASKS = 3;

export const WATCH_OUT_CLOSING_LINE =
  "Which of these apply to your business? That's what a Diagnostic finds out.";

export const HORIZONS: { id: RoadmapHorizon; label: string; sub: string; color: string }[] = [
  { id: "quick_win", label: "Quick Wins", sub: "Under 30 days, low effort", color: T.sys.AUTH },
  { id: "30_days", label: "Next 30 Days", sub: "Foundational fixes", color: T.sys.VIS },
  { id: "90_days", label: "30-90 Days", sub: "Structural improvements", color: T.sys.LFC },
  { id: "120_days", label: "90-120 Days", sub: "Strategic capability building", color: T.sys.CONV },
];

export function exportToCSV(items: RoadmapItem[]) {
  const rows: string[][] = [
    ["Time Horizon", "System", "Parent System", "Initiative", "Task", "Expected Outcome", "KPI to Track"],
  ];
  items
    .filter((item) => item.included && item.selectedTaskIndices.length > 0)
    .forEach((item) => {
      const horizonLabel = HORIZONS.find((h) => h.id === item.horizon)?.label || item.horizon;
      [...item.selectedTaskIndices].sort((a, b) => a - b).forEach((ti) => {
        const task = item.tasks[ti];
        if (!task) return;
        rows.push([
          horizonLabel, item.name, item.parent, item.title, task,
          item.outcomes[0] || "", item.kpis[ti] || item.kpis[0] || "",
        ]);
      });
    });
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "revenue-health-roadmap.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function FramingBanner() {
  return (
    <div style={{
      background: T.offWhite, border: "1px solid var(--mm-rule)",
      borderRadius: 14, padding: "20px 24px", marginBottom: 28,
    }}>
      <p style={{ fontFamily: "Inter", fontSize: 13, color: T.ink, margin: "0 0 6px", lineHeight: 1.65 }}>
        This roadmap is built from the standard playbook for each system — the same starting point every business in your position gets.
      </p>
      <p style={{ fontFamily: "Inter", fontSize: 13, color: T.mid, margin: "0 0 12px", lineHeight: 1.65 }}>
        A Revenue Health Diagnostic™ roadmap is built from your actual data, your team, and your constraints, not a template.
      </p>
      <a href="/diagnostic" style={{
        fontFamily: "Inter", fontSize: 12, fontWeight: 700, color: T.teal, textDecoration: "none",
      }}>
        See what a Diagnostic roadmap includes →
      </a>
    </div>
  );
}

export function WatchOutFor({ warnings, color }: { warnings: string[]; color: string }) {
  if (warnings.length === 0) return null;
  return (
    <div style={{
      marginTop: 16, padding: "14px 16px",
      background: T.offWhite, borderLeft: `2px solid ${color}40`, borderRadius: 6,
    }}>
      <div style={{
        fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10,
      }}>
        Watch out for
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {warnings.map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: T.mid, fontSize: 12, lineHeight: 1.6, flexShrink: 0 }}>—</span>
            <p style={{ fontSize: 12, fontFamily: "Inter", color: T.ink, lineHeight: 1.6, margin: 0 }}>{w}</p>
          </div>
        ))}
      </div>
      <p style={{
        fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.6,
        margin: "12px 0 0", fontStyle: "italic",
      }}>
        {WATCH_OUT_CLOSING_LINE}
      </p>
    </div>
  );
}

export function SystemCard({
  item, onToggleInclusion, onToggleTask,
}: {
  item: RoadmapItem;
  onToggleInclusion: (item: RoadmapItem) => void;
  onToggleTask: (item: RoadmapItem, index: number) => void;
}) {
  const [tab, setTab] = useState<"tasks" | "outcomes" | "kpis">("tasks");
  const atMax = item.selectedTaskIndices.length >= MAX_TASKS;

  if (!item.included) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "12px 18px", marginBottom: 12, borderRadius: 10,
        background: T.offWhite, border: "1px dashed rgba(0,0,0,0.1)",
      }}>
        <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
          <span style={{ fontWeight: 600 }}>{item.name}</span> — removed from your roadmap
        </div>
        <button onClick={() => onToggleInclusion(item)} style={{
          background: "transparent", border: `1px solid ${T.mid}40`, borderRadius: 8,
          padding: "5px 12px", fontFamily: "Inter", fontSize: 11, fontWeight: 600,
          color: T.ink, cursor: "pointer",
        }}>Add back</button>
      </div>
    );
  }

  return (
    <div style={{
      background: T.white, border: `1px solid ${item.color}30`,
      borderRadius: 12, overflow: "hidden", marginBottom: 12,
      boxShadow: `0 2px 12px ${item.color}10`,
    }}>
      <div style={{
        padding: "14px 18px", background: item.color + "08",
        borderBottom: `1px solid ${item.color}20`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: T.ink }}>{item.title}</div>
            <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 1 }}>
              {item.name} · {item.parent} System
            </div>
          </div>
        </div>
        <button onClick={() => onToggleInclusion(item)} style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: T.mid,
          textDecoration: "underline", whiteSpace: "nowrap",
        }}>Remove from roadmap</button>
      </div>

      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.offWhite}` }}>
        <p style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
          {item.why}
        </p>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${T.offWhite}` }}>
        {(["tasks", "outcomes", "kpis"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "9px 0", border: "none", cursor: "pointer",
            background: tab === t ? item.color + "10" : "transparent",
            borderBottom: tab === t ? `2px solid ${item.color}` : "2px solid transparent",
            color: tab === t ? item.color : T.mid,
            fontFamily: "Inter", fontSize: 11, fontWeight: tab === t ? 700 : 400,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {t === "tasks" ? "Action Items" : t === "outcomes" ? "Expected Outcomes" : "KPIs to Track"}
          </button>
        ))}
      </div>

      <div style={{ padding: "14px 18px" }}>
        {tab === "tasks" && (
          <>
            <div style={{
              fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid,
              letterSpacing: "0.1em", marginBottom: 10,
            }}>
              COMMIT TO 2–3 TASKS ({item.selectedTaskIndices.length}/{MAX_TASKS} SELECTED)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.tasks.map((task, i) => {
                const checked = item.selectedTaskIndices.includes(i);
                const disabled = atMax && !checked;
                return (
                  <button
                    key={i}
                    onClick={() => !disabled && onToggleTask(item, i)}
                    style={{
                      display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left",
                      background: checked ? item.color + "0D" : "transparent",
                      border: `1px solid ${checked ? item.color + "40" : "transparent"}`,
                      borderRadius: 8, padding: "8px 10px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.45 : 1,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      background: checked ? item.color : "transparent",
                      border: `1.5px solid ${checked ? item.color : "rgba(0,0,0,0.2)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: T.white, fontSize: 11, fontWeight: 700,
                    }}>{checked ? "✓" : ""}</div>
                    <p style={{ fontSize: 12, fontFamily: "Inter", color: T.ink, lineHeight: 1.6, margin: 0 }}>{task}</p>
                  </button>
                );
              })}
            </div>
            {atMax && (
              <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 8, fontStyle: "italic" }}>
                Maximum {MAX_TASKS} tasks selected. Deselect one to choose another.
              </div>
            )}
          </>
        )}
        {tab === "outcomes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {item.outcomes.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: item.color, fontSize: 14, flexShrink: 0 }}>+</span>
                <p style={{ fontSize: 12, fontFamily: "Inter", color: T.ink, lineHeight: 1.6, margin: 0 }}>{o}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "kpis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {item.kpis.map((k, i) => (
              <div key={i} style={{
                padding: "8px 12px", background: T.offWhite, borderRadius: 8,
                fontSize: 12, fontFamily: "Inter", color: T.ink, lineHeight: 1.5,
              }}>{k}</div>
            ))}
          </div>
        )}

        <WatchOutFor warnings={item.warnings} color={item.color} />
      </div>
    </div>
  );
}

export function HorizonSection({
  horizon, items, onToggleInclusion, onToggleTask,
}: {
  horizon: typeof HORIZONS[number];
  items: RoadmapItem[];
  onToggleInclusion: (item: RoadmapItem) => void;
  onToggleTask: (item: RoadmapItem, index: number) => void;
}) {
  const horizonItems = items.filter((i) => i.horizon === horizon.id);
  const includedCount = horizonItems.filter((i) => i.included).length;

  return (
    <div style={{
      background: T.white, border: "1px solid var(--mm-rule)",
      borderRadius: 14, marginBottom: 20, overflow: "hidden",
      boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
    }}>
      <div style={{
        padding: "16px 22px", background: horizon.color + "08",
        borderBottom: `1px solid ${horizon.color}20`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: horizon.color }} />
          <span style={{ fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: T.ink }}>{horizon.label}</span>
          <span style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>— {horizon.sub}</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, color: T.mid, whiteSpace: "nowrap" }}>
          {includedCount} {includedCount === 1 ? "system" : "systems"}
        </div>
      </div>

      <div style={{ padding: "18px 22px" }}>
        {horizonItems.length === 0 ? (
          <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, fontStyle: "italic" }}>
            Nothing in your Health Check placed a system in this horizon.
          </div>
        ) : (
          horizonItems.map((item) => (
            <SystemCard
              key={item.childSystemId || item.code}
              item={item}
              onToggleInclusion={onToggleInclusion}
              onToggleTask={onToggleTask}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Page() {
  const gate = useDiagnosticTierGate("/revenue/roadmap-builder-preview");
  const fetchRoadmap = useServerFn(getRoadmap);
  const saveInclusion = useServerFn(setRoadmapInclusion);
  const saveTasks = useServerFn(setRoadmapTasks);

  const { data, isLoading } = useQuery({
    queryKey: ["roadmap"],
    queryFn: () => fetchRoadmap({ data: {} }),
    enabled: gate.ready,
  });

  const [items, setItems] = useState<RoadmapItem[]>([]);

  useEffect(() => {
    if (data?.items) setItems(data.items);
  }, [data?.items]);

  const assessmentId = data?.assessmentId ?? null;
  const totalTasks = items.reduce(
    (n, i) => n + (i.included ? i.selectedTaskIndices.length : 0),
    0,
  );

  function toggleInclusion(item: RoadmapItem) {
    const next = !item.included;
    setItems((prev) =>
      prev.map((i) => (i.childSystemId === item.childSystemId ? { ...i, included: next } : i)),
    );
    if (assessmentId && item.childSystemId) {
      saveInclusion({ data: { assessmentId, childSystemId: item.childSystemId, included: next } })
        .catch(() => {});
    }
  }

  function toggleTask(item: RoadmapItem, index: number) {
    const current = item.selectedTaskIndices;
    const nextIndices = current.includes(index)
      ? current.filter((i) => i !== index)
      : current.length >= MAX_TASKS
        ? current
        : [...current, index].sort((a, b) => a - b);
    if (nextIndices === current) return;
    setItems((prev) =>
      prev.map((i) =>
        i.childSystemId === item.childSystemId ? { ...i, selectedTaskIndices: nextIndices } : i,
      ),
    );
    if (assessmentId && item.childSystemId) {
      saveTasks({ data: { assessmentId, childSystemId: item.childSystemId, taskIndices: nextIndices } })
        .catch(() => {});
    }
  }

  if (gate.checking || !gate.ready) {
    return <div style={{ padding: 40, fontFamily: "Inter", color: T.mid }}>Loading…</div>;
  }
  if (isLoading) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter", color: T.mid }}>Loading roadmap…</div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <div style={{
        height: 52, background: T.paper, borderBottom: `1px solid ${T.offWhite}`,
        display: "flex", alignItems: "center", padding: "0 40px",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: T.mid }}>Revenue Intelligence</span>
          <span style={{ fontSize: 12, color: T.mid }}>›</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>Roadmap Builder</span>
        </div>
        {totalTasks > 0 && (
          <button onClick={() => exportToCSV(items)} style={{
            background: T.teal, color: T.white, border: "none",
            borderRadius: 8, padding: "7px 16px",
            fontFamily: "Inter", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            Export CSV
          </button>
        )}
      </div>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE INTELLIGENCE › ROADMAP BUILDER
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>
              Roadmap Builder
            </h1>
            <p style={{ fontFamily: "Inter", fontSize: 14, color: T.mid, margin: 0, lineHeight: 1.65, maxWidth: 520 }}>
              Your Health Check placed each system into a time horizon. Choose the two or three tasks you're committing to for each one, and remove anything you're not taking on.
            </p>
          </div>
          {totalTasks > 0 && (
            <div style={{
              background: T.tealBright + "15", border: `1px solid ${T.tealBright}30`,
              borderRadius: 10, padding: "10px 16px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontSize: 22, fontFamily: "'Instrument Serif', Georgia, serif", color: T.teal, fontWeight: 400 }}>{totalTasks}</div>
              <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.06em" }}>TASKS</div>
            </div>
          )}
        </div>

        <FramingBanner />

        {HORIZONS.map((horizon) => (
          <HorizonSection
            key={horizon.id}
            horizon={horizon}
            items={items}
            onToggleInclusion={toggleInclusion}
            onToggleTask={toggleTask}
          />
        ))}

        <div style={{
          background: T.tealBright + "10", border: `1px solid ${T.tealBright}30`,
          borderRadius: 14, padding: "24px 28px", marginTop: 8,
        }}>
          <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.teal, letterSpacing: "0.12em", marginBottom: 8 }}>
            YOUR DIAGNOSTIC ROADMAP
          </div>
          <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18, fontWeight: 400, color: T.ink, margin: "0 0 6px" }}>
            Your full 120-day roadmap has been delivered.
          </h3>
          <p style={{ fontFamily: "Inter", fontSize: 13, color: T.mid, margin: 0, lineHeight: 1.6 }}>
            The self-serve builder above lets you track progress and adjust priorities between sessions.
          </p>
        </div>

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, marginTop: 32, fontSize: 11, fontFamily: "Inter", color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
