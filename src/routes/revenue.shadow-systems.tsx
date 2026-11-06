import { createFileRoute } from "@tanstack/react-router";
import { getSystemClass } from "@/lib/system-colors";
import { Badge } from "@/components/ui-mm";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getShadowSystems, type ShadowSystemItem } from "@/lib/report.functions";
import { useDiagnosticTierGate } from "@/components/reports/tier-gate";

export const Route = createFileRoute("/revenue/shadow-systems")({
  head: () => ({ meta: [{ title: "Shadow Systems™ — Revenue Health Visualizer™" }] }),
  component: Page,
});

export const ACTION_TYPES = {
  document: { label: "Document It", tone: "info" },
  formalise: { label: "Formalize It", tone: "warning" },
  rebuild: { label: "Rebuild It", tone: "neutral" },
  eliminate: { label: "Eliminate It", tone: "error" },
} as const;

export const TYPE_PILLS = {
  spreadsheet: { label: "Spreadsheet" },
  document: { label: "Document" },
  tribal: { label: "Tribal Knowledge" },
  informal_process: { label: "Informal Process" },
  workaround: { label: "Workaround" },
  messaging: { label: "Messaging Thread" },
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
    <div className="mm-risk-dots" role="img" aria-label={`Risk ${level} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`mm-risk-dot ${i < level ? "mm-risk-dot--on" : ""}`} />
      ))}
    </div>
  );
}

export function ShadowCard({ shadow, expanded, onToggle }: { shadow: ShadowSystemItem; expanded: boolean; onToggle: () => void }) {
  const action = ACTION_TYPES[shadow.actionType];
  const typeStyle = TYPE_PILLS[shadow.type];

  return (
    <div className={`mm-shadow ${expanded ? "mm-shadow--open" : ""}`}>
      <button onClick={onToggle} aria-expanded={expanded} className="mm-shadow__head">
        <div className="mm-shadow__icon" aria-hidden>{typeIcon(shadow.type)}</div>

        <div className="mm-flex-1">
          <div className="mm-shadow__name">{shadow.name}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`mm-shadow__sys ${getSystemClass(shadow.parentSystem)}`}>
              <span className="mm-sys-dot" />
              {shadow.parentSystem}
            </span>
            <Badge tone="neutral">{typeStyle.label}</Badge>
            <Badge tone={action.tone}>{action.label}</Badge>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <RiskDots level={shadow.riskLevel} />
          <span className="mm-shadow__chev" aria-hidden>⌄</span>
        </div>
      </button>

      {expanded && (
        <div className="mm-shadow__body">
          <div className="mm-grid mm-grid--2 mm-gap-sm mm-mb-lg">
            <div className="mm-shadow__cell">
              <div className="mm-shadow__label">KEY PERSON DEPENDENCY</div>
              <div className="mm-shadow__val mm-shadow__val--risk">{shadow.keyPerson}</div>
              <div className="mm-shadow__hint">Only person who fully understands this system</div>
            </div>
            <div className="mm-shadow__cell">
              <div className="mm-shadow__label">COMPENSATING FOR</div>
              <div className="mm-shadow__val">{shadow.compensatesFor}</div>
              <div className="mm-shadow__hint">Gap this shadow system is filling</div>
            </div>
          </div>

          <div className="mm-shadow__panel mm-mb-md">
            <div className="mm-shadow__label mm-mb-xs">WHAT WE FOUND IN THE PBJ SESSION</div>
            <p className="mm-shadow__p">{shadow.finding}</p>
          </div>

          <div className="mm-shadow__panel">
            <div className="mm-row mm-gap-xs mm-mb-xs">
              <Badge tone={action.tone}>{action.label}</Badge>
              <span className="mm-shadow__label m-0">RECOMMENDED ACTION</span>
            </div>
            <p className="mm-shadow__p">{shadow.recommended}</p>
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

  if (gate.checking || !gate.ready || isLoading || !data) {
    return <div className="mm-loading-pad">Loading…</div>;
  }

  return (
    <div className="mm-page-bg">
      <main className="mm-page mm-page--narrow">
        <div className="mm-breadcrumb">REVENUE INTELLIGENCE › SHADOW SYSTEMS™</div>

        <div className="mm-mb-2xl">
          <h1 className="mm-heading-xl mm-text mb-2.5">Shadow Systems™</h1>
          <p className="mm-report-lede max-w-[580px] leading-[1.7]">
            Shadow systems are the undocumented infrastructure your business actually runs on — spreadsheets, Google Docs, WhatsApp threads, and institutional knowledge that exist in the gaps between your org chart and operational reality. They work until they don't.
          </p>
        </div>

        {data.state === "ready" ? (
          <div>
            <div className="mm-callout-ok mm-mb-lg">
              <span className="mm-callout-ok__icon" aria-hidden>✓</span>
              <div>
                <span className="font-semibold">{data.shadows.length} shadow systems identified</span>
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
          <div className="mm-callout-warn text-[13px] mm-text">
            Your Diagnostic session has not been completed yet. Book your session to uncover your shadow systems.
          </div>
        )}

        <div className="mm-footer">© 2025 Marketplace Maven. All rights reserved.</div>
      </main>
    </div>
  );
}
