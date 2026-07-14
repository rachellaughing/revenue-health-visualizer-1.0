import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getShadowSystems, type ShadowSystemItem } from "@/lib/report.functions";
import { useDiagnosticTierGate } from "@/components/reports/tier-gate";

export const Route = createFileRoute("/revenue/shadow-systems")({
  head: () => ({ meta: [{ title: "Shadow Systems™ — Revenue Health Visualiser™" }] }),
  component: Page,
});

export const T = {
  abyss: "#182829", paper: "#FFFEFA", offWhite: "#F5F5F0",
  ember: "#F05223", teal: "#2A6B6E", tealBright: "#4ABFC4",
  sand: "#C4956A", mid: "#888880", ink: "#111111", white: "#FFFFFF",
  sys: { POS: "#3B82F6", AUTH: "#10B981", CONV: "#F05223", LFC: "#8B5CF6", VIS: "#F59E0B" },
};

export const ACTION_TYPES = {
  document: { label: "Document It", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  formalise: { label: "Formalise It", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  rebuild: { label: "Rebuild It", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
  eliminate: { label: "Eliminate It", color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
} as const;

export const TYPE_PILLS = {
  spreadsheet: { label: "Spreadsheet", color: T.sys.AUTH },
  document: { label: "Document", color: T.sys.POS },
  tribal: { label: "Tribal Knowledge", color: T.sand },
  informal_process: { label: "Informal Process", color: T.sys.CONV },
  workaround: { label: "Workaround", color: "#EF4444" },
  messaging: { label: "Messaging Thread", color: T.sys.LFC },
} as const;

export function typeIcon(t: string) {
  return t === "spreadsheet" ? "📊"
    : t === "document" ? "📄"
    : t === "messaging" ? "💬"
    : t === "tribal" ? "🧠"
    : t === "workaround" ? "🔧"
    : "⚙️";
}

export function RiskDots({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: i < level ? "#EF4444" : T.offWhite,
        }} />
      ))}
    </div>
  );
}

export function ShadowCard({ shadow, expanded, onToggle }: { shadow: ShadowSystemItem; expanded: boolean; onToggle: () => void }) {
  const action = ACTION_TYPES[shadow.actionType];
  const typeStyle = TYPE_PILLS[shadow.type];

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${expanded ? T.sand + "60" : "rgba(0,0,0,0.07)"}`,
      borderRadius: 14, marginBottom: 14, overflow: "hidden",
      boxShadow: expanded ? "0 4px 20px rgba(196,149,106,0.15)" : "0 2px 6px rgba(24,40,41,0.04)",
      transition: "all 0.2s",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "18px 22px",
        display: "flex", alignItems: "flex-start", gap: 16,
        background: expanded ? "rgba(196,149,106,0.04)" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
        borderBottom: expanded ? `1px solid ${T.offWhite}` : "none",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: T.abyss + "08", border: "1px solid rgba(24,40,41,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{typeIcon(shadow.type)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontFamily: "Inter", fontWeight: 600, color: T.ink, marginBottom: 8 }}>
            {shadow.name}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: shadow.parentColor + "18", color: shadow.parentColor, fontSize: 10, fontFamily: "Inter", fontWeight: 700 }}>{shadow.parentSystem}</span>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: typeStyle.color + "15", color: typeStyle.color, fontSize: 10, fontFamily: "Inter", fontWeight: 600 }}>{typeStyle.label}</span>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: action.bg, color: action.color, fontSize: 10, fontFamily: "Inter", fontWeight: 700 }}>{action.label}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <RiskDots level={shadow.riskLevel} />
          <span style={{
            fontSize: 11, color: T.mid,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s", display: "inline-block", marginTop: 4,
          }}>⌄</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: T.offWhite, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 4 }}>KEY PERSON DEPENDENCY</div>
              <div style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#EF4444" }}>{shadow.keyPerson}</div>
              <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 2 }}>Only person who fully understands this system</div>
            </div>
            <div style={{ background: T.offWhite, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 4 }}>COMPENSATING FOR</div>
              <div style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: shadow.parentColor }}>{shadow.compensatesFor}</div>
              <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 2 }}>Gap this shadow system is filling</div>
            </div>
          </div>

          <div style={{ background: T.abyss + "05", border: "1px solid rgba(24,40,41,0.1)", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 8 }}>WHAT WE FOUND IN THE PBJ SESSION</div>
            <p style={{ fontSize: 13, fontFamily: "Inter", color: T.ink, lineHeight: 1.75, margin: 0 }}>{shadow.finding}</p>
          </div>

          <div style={{ background: action.bg, border: `1px solid ${action.color}25`, borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ padding: "2px 10px", borderRadius: 20, background: action.color + "20", color: action.color, fontSize: 10, fontFamily: "Inter", fontWeight: 700 }}>{action.label}</span>
              <span style={{ fontSize: 9, fontFamily: "Inter", color: T.mid, letterSpacing: "0.08em", fontWeight: 600 }}>RECOMMENDED ACTION</span>
            </div>
            <p style={{ fontSize: 13, fontFamily: "Inter", color: T.ink, lineHeight: 1.7, margin: 0 }}>{shadow.recommended}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Page() {
  const gate = useDiagnosticTierGate("/revenue/shadow-systems-preview");
  const fetchData = useServerFn(getShadowSystems);
  const { data, isLoading } = useQuery({
    queryKey: ["shadow-systems"],
    queryFn: () => fetchData({ data: {} }),
    enabled: gate.ready,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (gate.checking || !gate.ready) {
    return <div style={{ padding: 40, fontFamily: "Inter", color: T.mid }}>Loading…</div>;
  }
  if (isLoading || !data) {
    return <div style={{ padding: 40, fontFamily: "Inter", color: T.mid }}>Loading…</div>;
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE INTELLIGENCE › SHADOW SYSTEMS™
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, fontWeight: 400, color: T.ink, margin: "0 0 10px" }}>
            Shadow Systems™
          </h1>
          <p style={{ fontFamily: "Inter", fontSize: 14, color: T.mid, margin: 0, lineHeight: 1.7, maxWidth: 580 }}>
            Shadow systems are the undocumented infrastructure your business actually runs on — spreadsheets, Google Docs, WhatsApp threads, and institutional knowledge that exist in the gaps between your org chart and operational reality. They work until they don't.
          </p>
        </div>

        {data.state === "ready" ? (
          <div>
            <div style={{
              background: T.tealBright + "12", border: `1px solid ${T.tealBright}30`,
              borderRadius: 10, padding: "12px 18px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 14 }}>✓</span>
              <div style={{ fontSize: 13, fontFamily: "Inter", color: T.ink }}>
                <span style={{ fontWeight: 600 }}>{data.shadows.length} shadow systems identified</span>
                {" "}across {data.systemsCount} revenue systems in your Revenue Health Diagnostic™ session.
              </div>
            </div>
            {data.shadows.map((s) => (
              <ShadowCard key={s.id} shadow={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
            ))}
          </div>
        ) : (
          <div style={{
            background: T.sand + "18", border: `1px solid ${T.sand}40`,
            borderRadius: 10, padding: "12px 18px",
            fontSize: 13, fontFamily: "Inter", color: T.ink,
          }}>
            Your Diagnostic session has not been completed yet. Book your session to uncover your shadow systems.
          </div>
        )}

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, marginTop: 32, fontSize: 11, fontFamily: "Inter", color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
