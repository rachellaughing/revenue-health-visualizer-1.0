import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  getRoadmap,
  saveRoadmapSelection,
  deleteRoadmapSelection,
  type RoadmapItem,
  type RoadmapHorizon,
  type RoadmapSelection,
} from "@/lib/report.functions";
import { useDiagnosticTierGate } from "@/components/reports/tier-gate";

export const Route = createFileRoute("/revenue/roadmap-builder")({
  head: () => ({ meta: [{ title: "Roadmap Builder — Revenue Health Visualiser™" }] }),
  component: Page,
});

export const T = {
  abyss: "#182829", paper: "#FFFEFA", offWhite: "#F5F5F0",
  ember: "#F05223", teal: "#2A6B6E", tealBright: "#4ABFC4",
  mid: "#888880", ink: "#111111", white: "#FFFFFF",
  sys: { POS: "#3B82F6", AUTH: "#10B981", CONV: "#F05223", LFC: "#8B5CF6", VIS: "#F59E0B" },
};

export const HORIZONS: { id: RoadmapHorizon; label: string; sub: string; color: string; max: number }[] = [
  { id: "quick_win", label: "Quick Wins", sub: "Under 30 days, low effort", color: T.sys.AUTH, max: 3 },
  { id: "30_days", label: "Next 30 Days", sub: "Foundational fixes", color: T.sys.VIS, max: 3 },
  { id: "90_days", label: "30-90 Days", sub: "Structural improvements", color: T.sys.LFC, max: 2 },
  { id: "120_days", label: "90-120 Days", sub: "Strategic capability building", color: T.sys.CONV, max: 2 },
];

export function exportToCSV(selections: RoadmapSelection[], items: RoadmapItem[]) {
  const rows: string[][] = [
    ["Time Horizon", "System", "Parent System", "Initiative", "Task", "Expected Outcome", "KPI to Track"],
  ];
  selections.forEach((sel) => {
    const item = items.find((i) => i.code === sel.code && i.horizon === sel.horizon);
    if (!item) return;
    const horizonLabel = HORIZONS.find((h) => h.id === sel.horizon)?.label || sel.horizon;
    item.tasks.forEach((task, ti) => {
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

export function ItemChip({ item, selected, onToggle, disabled }: { item: RoadmapItem; selected: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button
      onClick={() => !(disabled && !selected) && onToggle()}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 20,
        border: `1.5px solid ${selected ? item.color : "rgba(0,0,0,0.1)"}`,
        background: selected ? item.color + "15" : T.white,
        color: selected ? item.color : T.ink,
        fontFamily: "Inter", fontSize: 12,
        fontWeight: selected ? 600 : 400,
        cursor: disabled && !selected ? "not-allowed" : "pointer",
        opacity: disabled && !selected ? 0.4 : 1,
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
      {item.name}
      {selected && <span style={{ fontSize: 10, marginLeft: 2 }}>×</span>}
    </button>
  );
}

export function SelectedItemDetail({ item }: { item: RoadmapItem }) {
  const [tab, setTab] = useState<"tasks" | "outcomes" | "kpis">("tasks");
  return (
    <div style={{
      background: T.white, border: `1px solid ${item.color}30`,
      borderRadius: 12, overflow: "hidden", marginBottom: 12,
      boxShadow: `0 2px 12px ${item.color}10`,
    }}>
      <div style={{
        padding: "14px 18px", background: item.color + "08",
        borderBottom: `1px solid ${item.color}20`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
        <div>
          <div style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: T.ink }}>{item.title}</div>
          <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 1 }}>{item.parent} System</div>
        </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {item.tasks.map((task, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: item.color + "18", border: `1.5px solid ${item.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: item.color,
                }}>{i + 1}</div>
                <p style={{ fontSize: 12, fontFamily: "Inter", color: T.ink, lineHeight: 1.6, margin: 0 }}>{task}</p>
              </div>
            ))}
          </div>
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
      </div>
    </div>
  );
}

export function HorizonSection({
  horizon, items, selections, onToggle,
}: {
  horizon: typeof HORIZONS[number];
  items: RoadmapItem[];
  selections: RoadmapSelection[];
  onToggle: (item: RoadmapItem, h: RoadmapHorizon) => void;
}) {
  const horizonItems = items.filter((i) => i.horizon === horizon.id);
  const selected = selections.filter((s) => s.horizon === horizon.id);
  const selectedItems = horizonItems.filter((i) => selected.some((s) => s.code === i.code));
  const atMax = selected.length >= horizon.max;

  return (
    <div style={{
      background: T.white, border: "1px solid rgba(0,0,0,0.07)",
      borderRadius: 14, marginBottom: 20, overflow: "hidden",
      boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
    }}>
      <div style={{
        padding: "16px 22px", background: horizon.color + "08",
        borderBottom: `1px solid ${horizon.color}20`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: horizon.color }} />
          <span style={{ fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: T.ink }}>{horizon.label}</span>
          <span style={{ fontSize: 11, fontFamily: "Inter", color: T.mid }}>— {horizon.sub}</span>
        </div>
        <div style={{
          fontSize: 11, fontFamily: "Inter", fontWeight: 600,
          color: selected.length === horizon.max ? horizon.color : T.mid,
        }}>
          {selected.length}/{horizon.max} selected
        </div>
      </div>

      <div style={{ padding: "18px 22px" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 10 }}>
            SELECT UP TO {horizon.max}
          </div>
          {horizonItems.length === 0 ? (
            <div style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, fontStyle: "italic" }}>
              No initiatives mapped to this horizon yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {horizonItems.map((item) => (
                <ItemChip
                  key={item.code}
                  item={item}
                  selected={selected.some((s) => s.code === item.code)}
                  onToggle={() => onToggle(item, horizon.id)}
                  disabled={atMax && !selected.some((s) => s.code === item.code)}
                />
              ))}
            </div>
          )}
          {atMax && (
            <div style={{ fontSize: 11, fontFamily: "Inter", color: horizon.color, marginTop: 8, fontStyle: "italic" }}>
              Maximum {horizon.max} selected for this horizon. Deselect one to choose another.
            </div>
          )}
        </div>

        {selectedItems.length > 0 ? (
          <div style={{ borderTop: `1px solid ${T.offWhite}`, paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 12 }}>
              YOUR SELECTED INITIATIVES
            </div>
            {selectedItems.map((item) => <SelectedItemDetail key={item.code} item={item} />)}
          </div>
        ) : (
          <div style={{
            borderTop: `1px solid ${T.offWhite}`, paddingTop: 14,
            fontSize: 12, fontFamily: "Inter", color: T.mid, fontStyle: "italic",
          }}>
            Select initiatives above to see action items, expected outcomes, and KPIs.
          </div>
        )}
      </div>
    </div>
  );
}

function Page() {
  const gate = useDiagnosticTierGate("/revenue/roadmap-builder-preview");
  const fetchRoadmap = useServerFn(getRoadmap);
  const saveSel = useServerFn(saveRoadmapSelection);
  const deleteSel = useServerFn(deleteRoadmapSelection);

  const { data, isLoading } = useQuery({
    queryKey: ["roadmap"],
    queryFn: () => fetchRoadmap({ data: {} }),
    enabled: gate.ready,
  });

  const [selections, setSelections] = useState<RoadmapSelection[]>([]);

  useEffect(() => {
    if (data?.selections) setSelections(data.selections);
  }, [data?.selections]);

  const items = data?.items ?? [];
  const assessmentId = data?.assessmentId ?? null;
  const totalSelected = selections.length;

  function toggleSelection(item: RoadmapItem, horizonId: RoadmapHorizon) {
    const exists = selections.find((s) => s.code === item.code && s.horizon === horizonId);
    if (exists) {
      setSelections(selections.filter((s) => !(s.code === item.code && s.horizon === horizonId)));
      if (assessmentId && item.childSystemId) {
        deleteSel({ data: { assessmentId, childSystemId: item.childSystemId, horizon: horizonId } }).catch(() => {});
      }
    } else {
      const horizon = HORIZONS.find((h) => h.id === horizonId)!;
      const currentCount = selections.filter((s) => s.horizon === horizonId).length;
      if (currentCount >= horizon.max) return;
      setSelections([...selections, { code: item.code, horizon: horizonId }]);
      if (assessmentId && item.childSystemId) {
        saveSel({ data: { assessmentId, childSystemId: item.childSystemId, horizon: horizonId } }).catch(() => {});
      }
    }
  }

  function handleExport() {
    exportToCSV(selections, items);
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
        {totalSelected > 0 && (
          <button onClick={handleExport} style={{
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
              Select the initiatives you want to work on across each time horizon. For each selection you get specific action items, expected outcomes, and KPIs to track progress.
            </p>
          </div>
          {totalSelected > 0 && (
            <div style={{
              background: T.tealBright + "15", border: `1px solid ${T.tealBright}30`,
              borderRadius: 10, padding: "10px 16px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontSize: 22, fontFamily: "'Instrument Serif', Georgia, serif", color: T.teal, fontWeight: 400 }}>{totalSelected}</div>
              <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.06em" }}>SELECTED</div>
            </div>
          )}
        </div>

        {HORIZONS.map((horizon) => (
          <HorizonSection
            key={horizon.id}
            horizon={horizon}
            items={items}
            selections={selections}
            onToggle={toggleSelection}
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
