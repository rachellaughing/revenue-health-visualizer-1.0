import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getShadowSystems, type ShadowSystemItem } from "@/lib/report.functions";

export const Route = createFileRoute("/revenue/shadow-systems")({
  head: () => ({ meta: [{ title: "Shadow Systems™ — Revenue Health Visualiser™" }] }),
  component: Page,
});

const T = {
  abyss: "#182829", paper: "#FFFEFA", offWhite: "#F5F5F0",
  ember: "#F05223", teal: "#2A6B6E", tealBright: "#4ABFC4",
  sand: "#C4956A", mid: "#888880", ink: "#111111", white: "#FFFFFF",
  sys: { POS: "#3B82F6", AUTH: "#10B981", CONV: "#F05223", LFC: "#8B5CF6", VIS: "#F59E0B" },
};

const ACTION_TYPES = {
  document: { label: "Document It", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  formalise: { label: "Formalise It", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  rebuild: { label: "Rebuild It", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
  eliminate: { label: "Eliminate It", color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
} as const;

const TYPE_PILLS = {
  spreadsheet: { label: "Spreadsheet", color: T.sys.AUTH },
  document: { label: "Document", color: T.sys.POS },
  tribal: { label: "Tribal Knowledge", color: T.sand },
  informal_process: { label: "Informal Process", color: T.sys.CONV },
  workaround: { label: "Workaround", color: "#EF4444" },
  messaging: { label: "Messaging Thread", color: T.sys.LFC },
} as const;

const ILLUSTRATIVE_SHADOWS: ShadowSystemItem[] = [
  {
    id: "ill-1", name: "Churn Risk Tracker",
    parentSystem: "Lifecycle", parentColor: T.sys.LFC,
    type: "spreadsheet", keyPerson: "Sarah (CS Lead)",
    compensatesFor: "Customer Success", riskLevel: 5, actionType: "rebuild",
    finding: "Sarah built a Google Sheet 18 months ago that scores churn risk across the customer base. It pulls data manually from three tools and requires Sarah to update it weekly. Three versions exist across the team. No one else fully understands the scoring logic. If Sarah left tomorrow, the company would lose its only early warning system for at-risk accounts.",
    recommended: "Rebuild the churn risk model in your CS platform with documented scoring criteria. Transfer ownership to a process, not a person. Sarah's logic should be codified and version-controlled.",
  },
  {
    id: "ill-2", name: "Onboarding Playbook (Unofficial)",
    parentSystem: "Lifecycle", parentColor: T.sys.LFC,
    type: "document", keyPerson: "Marcus (Senior CSM)",
    compensatesFor: "Customer Onboarding", riskLevel: 4, actionType: "formalise",
    finding: "Marcus maintains a 47-tab Notion document that new CSMs use to set up accounts. It was never reviewed by leadership and predates the current product by two versions. New hires treat it as authoritative. Three conflicting versions exist. Two onboarding steps in the document reference a feature that was deprecated in Q3.",
    recommended: "Audit the document against the current product. Assign a formal owner. Move to a controlled location with version history. Build a quarterly review cadence into CS operations.",
  },
  {
    id: "ill-3", name: "Deal Desk WhatsApp Group",
    parentSystem: "Conversion", parentColor: T.sys.CONV,
    type: "messaging", keyPerson: "Founder + 2 AEs",
    compensatesFor: "Sales Process", riskLevel: 5, actionType: "eliminate",
    finding: "Pricing exceptions, non-standard terms, and discount approvals are handled in a WhatsApp group between the founder and two account executives. No documentation, no audit trail, no defined criteria for what qualifies for an exception. The group has been active for 14 months and contains 847 messages. Three deals in the last quarter were approved at non-standard pricing with no record in the CRM.",
    recommended: "This shadow system exists because a formal pricing authority matrix does not. Eliminate the WhatsApp process and replace it with a tiered approval framework in the CRM. Define what AEs can approve independently, what requires manager sign-off, and what escalates to the founder.",
  },
  {
    id: "ill-4", name: "Prospect Research Template",
    parentSystem: "Positioning", parentColor: T.sys.POS,
    type: "document", keyPerson: "Jamie (BDR)",
    compensatesFor: "ICP Definition", riskLevel: 3, actionType: "document",
    finding: "Jamie created a prospect research template that the BDR team uses to qualify inbound leads. It was built from Jamie's personal understanding of the ICP after 6 months in the role. The template has never been reviewed against the official ICP definition (which itself has not been updated in 11 months). The BDR team is qualifying leads against a shadow version of the ICP, not the official one.",
    recommended: "Review Jamie's template against the current ICP criteria. Where Jamie's template is better, update the official ICP definition. Where the official definition is more accurate, update the template. Then document it officially and add it to BDR onboarding.",
  },
];

const LOCKED_SHADOWS = [
  { id: "lock-1", name: "Revenue Reconciliation Process", parentSystem: "Visibility", parentColor: T.sys.VIS, type: "spreadsheet" as const, riskLevel: 5 },
  { id: "lock-2", name: "Renewal Negotiation Framework", parentSystem: "Lifecycle", parentColor: T.sys.LFC, type: "tribal" as const, riskLevel: 4 },
  { id: "lock-3", name: "Competitor Response Playbook", parentSystem: "Positioning", parentColor: T.sys.POS, type: "document" as const, riskLevel: 3 },
  { id: "lock-4", name: "Escalation Decision Tree", parentSystem: "Conversion", parentColor: T.sys.CONV, type: "informal_process" as const, riskLevel: 4 },
];

function typeIcon(t: string) {
  return t === "spreadsheet" ? "📊"
    : t === "document" ? "📄"
    : t === "messaging" ? "💬"
    : t === "tribal" ? "🧠"
    : t === "workaround" ? "🔧"
    : "⚙️";
}

function RiskDots({ level }: { level: number }) {
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

function ShadowCard({ shadow, expanded, onToggle }: { shadow: ShadowSystemItem; expanded: boolean; onToggle: () => void }) {
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

function BlurredCard({ shadow }: { shadow: typeof LOCKED_SHADOWS[number] }) {
  const typeStyle = TYPE_PILLS[shadow.type];
  return (
    <div style={{
      background: T.white, border: "1px solid rgba(0,0,0,0.07)",
      borderRadius: 14, marginBottom: 14, overflow: "hidden",
      filter: "blur(4px)", userSelect: "none", pointerEvents: "none", opacity: 0.6,
    }}>
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: T.offWhite, border: "1px solid rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{typeIcon(shadow.type)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontFamily: "Inter", fontWeight: 600, color: T.ink, marginBottom: 8 }}>{shadow.name}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: shadow.parentColor + "18", color: shadow.parentColor, fontSize: 10, fontWeight: 700 }}>{shadow.parentSystem}</span>
            <span style={{ padding: "2px 10px", borderRadius: 20, background: typeStyle.color + "15", color: typeStyle.color, fontSize: 10, fontWeight: 600 }}>{typeStyle.label}</span>
          </div>
        </div>
        <RiskDots level={shadow.riskLevel} />
      </div>
    </div>
  );
}

function PBJDivider() {
  return (
    <div style={{ margin: "36px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{ flex: 1, height: 1, background: T.offWhite }} />
        <div style={{
          padding: "6px 16px", borderRadius: 20, background: T.abyss, color: T.white,
          fontSize: 11, fontFamily: "Inter", fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap",
        }}>HOW WE FIND THE REST</div>
        <div style={{ flex: 1, height: 1, background: T.offWhite }} />
      </div>

      <div style={{
        background: T.abyss, borderRadius: 16, padding: "28px 32px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
      }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 10 }}>REVENUE HEALTH DIAGNOSTIC™</div>
          <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400, color: T.white, margin: "0 0 14px", lineHeight: 1.3 }}>
            The 4 shadow systems above are illustrative. Your business has its own.
          </h3>
          <p style={{ fontFamily: "Inter", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: "0 0 16px" }}>
            Shadow systems do not appear in any Health Check score. They exist in the gaps between what your org chart says and how work actually gets done. The only way to surface them is to go looking — deliberately, with the right questions and the right people in the room.
          </p>
          <p style={{ fontFamily: "Inter", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: "0 0 20px" }}>
            We do this through a series of PBJ Sessions — a structured facilitation methodology that makes the invisible visible.
          </p>
          <a href="https://marketplacemaven.com/pbj-sessions" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.tealBright, fontFamily: "Inter", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            What is a PBJ Session? →
          </a>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "22px 24px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 14 }}>WHAT HAPPENS IN A PBJ SESSION</div>
          {[
            "We sit with your team — not just leadership — and ask them to walk us through how things actually work, not how they should work.",
            "We follow the gaps. When a process relies on a specific person, a specific file, or institutional memory, we dig deeper.",
            "We document what we find. Every shadow system gets a name, an owner, a risk assessment, and a recommended action.",
            "We bring it back to you. The Founder Dependency and Shadow Systems reports are built from what we find in these sessions.",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 3 ? 14 : 0 }}>
              <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.tealBright, width: 20, flexShrink: 0, paddingTop: 1 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <p style={{ fontSize: 12, fontFamily: "Inter", color: "rgba(255,255,255,0.6)", lineHeight: 1.65, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagnosticCTA() {
  return (
    <div style={{
      background: T.ember, borderRadius: 16, padding: "28px 32px",
      display: "grid", gridTemplateColumns: "1fr auto", gap: 24,
      alignItems: "center", marginTop: 8,
    }}>
      <div>
        <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", marginBottom: 8 }}>UNLOCK YOUR SHADOW SYSTEMS</div>
        <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22, fontWeight: 400, color: T.white, margin: "0 0 6px" }}>
          Find out what your business is running on that nobody knows about.
        </h3>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.6 }}>
          The Revenue Health Diagnostic™ surfaces every shadow system in your business — with a named owner, risk assessment, and concrete action for each one.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        <Link to="/diagnostic" style={{
          display: "inline-block", background: T.white, color: T.ember,
          fontFamily: "Inter", fontSize: 13, fontWeight: 700,
          padding: "12px 24px", borderRadius: 10, textDecoration: "none",
          textAlign: "center", whiteSpace: "nowrap",
        }}>Book a Diagnostic →</Link>
        <a href="https://marketplacemaven.com/diagnostic" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", color: "rgba(255,255,255,0.9)", fontFamily: "Inter", fontSize: 12, textDecoration: "none", textAlign: "center" }}>
          Learn more first →
        </a>
      </div>
    </div>
  );
}

function Page() {
  const fetchData = useServerFn(getShadowSystems);
  const { data, isLoading } = useQuery({
    queryKey: ["shadow-systems"],
    queryFn: () => fetchData({ data: {} }),
  });

  const [expandedId, setExpandedId] = useState<string | null>("ill-1");

  if (isLoading || !data) {
    return <div style={{ padding: 40, fontFamily: "Inter", color: T.mid }}>Loading…</div>;
  }

  const isDiagnosticReady = data.state === "ready";

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

        {isDiagnosticReady ? (
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
          <div>
            {data.state === "pending" && (
              <div style={{
                background: T.sand + "18", border: `1px solid ${T.sand}40`,
                borderRadius: 10, padding: "12px 18px", marginBottom: 24,
                fontSize: 13, fontFamily: "Inter", color: T.ink,
              }}>
                Your Diagnostic session has not been completed yet. Book your session to uncover your shadow systems.
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                padding: "4px 12px", borderRadius: 20,
                background: T.sand + "20", border: `1px solid ${T.sand}40`,
                fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.sand, letterSpacing: "0.06em",
              }}>ILLUSTRATIVE EXAMPLES</div>
              <span style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
                Based on shadow systems commonly found in businesses like yours. Yours will be different.
              </span>
            </div>

            {ILLUSTRATIVE_SHADOWS.map((s) => (
              <ShadowCard key={s.id} shadow={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
            ))}

            <PBJDivider />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                padding: "4px 12px", borderRadius: 20,
                background: T.abyss + "12", border: `1px solid ${T.abyss}20`,
                fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.abyss, letterSpacing: "0.06em",
              }}>YOUR SHADOW SYSTEMS</div>
              <span style={{ fontSize: 12, fontFamily: "Inter", color: T.mid }}>
                Uncovered through your Revenue Health Diagnostic™ session.
              </span>
            </div>

            <div style={{ position: "relative" }}>
              {LOCKED_SHADOWS.map((s) => <BlurredCard key={s.id} shadow={s} />)}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(to bottom, transparent 0%, ${T.paper}cc 40%, ${T.paper} 100%)`,
              }}>
                <div style={{ textAlign: "center", paddingTop: 60 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                  <p style={{ fontSize: 13, fontFamily: "Inter", color: T.mid, marginBottom: 0 }}>
                    Your shadow systems are waiting to be uncovered.
                  </p>
                </div>
              </div>
            </div>

            <DiagnosticCTA />
          </div>
        )}

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, marginTop: 32, fontSize: 11, fontFamily: "Inter", color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
