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
  abyss: "var(--mm-abyss)", paper: "var(--mm-paper)", offWhite: "var(--mm-off-white)",
  ember: "var(--mm-ember)", teal: "var(--mm-teal)", tealBright: "var(--mm-teal-bright)",
  sand: "var(--mm-sand)", mid: "var(--mm-mid)", ink: "var(--mm-ink)", white: "var(--mm-white)",
  sys: { POS: "var(--mm-sys-positioning)", AUTH: "var(--mm-sys-authority)", CONV: "var(--mm-ember)", LFC: "var(--mm-sys-lifecycle)", VIS: "var(--mm-sys-visibility)" },
};

export const ACTION_TYPES = {
  document: { label: "Document It", color: "var(--mm-sys-authority)", bg: "color-mix(in srgb, var(--mm-sys-authority) 8.0%, transparent)" },
  formalise: { label: "Formalise It", color: "var(--mm-sys-visibility)", bg: "rgba(245,158,11,0.08)" },
  rebuild: { label: "Rebuild It", color: "var(--mm-sys-lifecycle)", bg: "rgba(139,92,246,0.08)" },
  eliminate: { label: "Eliminate It", color: "var(--mm-danger)", bg: "color-mix(in srgb, var(--mm-danger) 8.0%, transparent)" },
} as const;

export const TYPE_PILLS = {
  spreadsheet: { label: "Spreadsheet", color: T.sys.AUTH },
  document: { label: "Document", color: T.sys.POS },
  tribal: { label: "Tribal Knowledge", color: T.sand },
  informal_process: { label: "Informal Process", color: T.sys.CONV },
  workaround: { label: "Workaround", color: "var(--mm-danger)" },
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
          background: i < level ? "var(--mm-danger)" : T.offWhite,
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
      background: T.offWhite,
      border: `1px solid ${expanded ? `color-mix(in srgb, ${T.sand} 38%, transparent)` : "var(--mm-rule)"}`,
      borderRadius: 14, marginBottom: 14, overflow: "hidden",
      boxShadow: expanded ? "0 4px 20px color-mix(in srgb, var(--mm-sand) 15.0%, transparent)" : "0 2px 6px color-mix(in srgb, var(--mm-abyss) 4.0%, transparent)",
      transition: "all 0.2s",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "18px 22px",
        display: "flex", alignItems: "flex-start", gap: 16,
        background: expanded ? "color-mix(in srgb, var(--mm-sand) 4.0%, transparent)" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
        borderBottom: expanded ? `1px solid ${T.offWhite}` : "none",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `color-mix(in srgb, ${T.abyss} 3%, transparent)`, border: "1px solid var(--mm-rule)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{typeIcon(shadow.type)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontFamily: "Inter", fontWeight: 600, color: T.ink, marginBottom: 8 }}>
            {shadow.name}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: `color-mix(in srgb, ${shadow.parentColor} 9%, transparent)`, color: shadow.parentColor, fontSize: 10, fontFamily: "Inter", fontWeight: 700 }}>{shadow.parentSystem}</span>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: `color-mix(in srgb, ${typeStyle.color} 8%, transparent)`, color: typeStyle.color, fontSize: 10, fontFamily: "Inter", fontWeight: 600 }}>{typeStyle.label}</span>
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
              <div style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "var(--mm-danger)" }}>{shadow.keyPerson}</div>
              <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 2 }}>Only person who fully understands this system</div>
            </div>
            <div style={{ background: T.offWhite, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 4 }}>COMPENSATING FOR</div>
              <div style={{ fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: shadow.parentColor }}>{shadow.compensatesFor}</div>
              <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 2 }}>Gap this shadow system is filling</div>
            </div>
          </div>

          <div style={{ background: `color-mix(in srgb, ${T.abyss} 2%, transparent)`, border: "1px solid var(--mm-rule)", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 8 }}>WHAT WE FOUND IN THE PBJ SESSION</div>
            <p style={{ fontSize: 13, fontFamily: "Inter", color: T.ink, lineHeight: 1.75, margin: 0 }}>{shadow.finding}</p>
          </div>

          <div style={{ background: action.bg, border: `1px solid ${`color-mix(in srgb, ${action.color} 15%, transparent)`}`, borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ padding: "2px 10px", borderRadius: 20, background: `color-mix(in srgb, ${action.color} 13%, transparent)`, color: action.color, fontSize: 10, fontFamily: "Inter", fontWeight: 700 }}>{action.label}</span>
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
              background: `color-mix(in srgb, ${T.tealBright} 7%, transparent)`, border: `1px solid ${`color-mix(in srgb, ${T.tealBright} 19%, transparent)`}`,
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
            background: `color-mix(in srgb, ${T.sand} 9%, transparent)`, border: `1px solid ${`color-mix(in srgb, ${T.sand} 25%, transparent)`}`,
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
