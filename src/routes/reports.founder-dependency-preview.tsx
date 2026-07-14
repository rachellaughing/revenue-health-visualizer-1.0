import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { FDSystem, FDProcess } from "@/lib/report.functions";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import {
  T,
  DependencyRing,
  DependencySplit,
  BlastRadiusTimeline,
  ActionPlan,
  SystemsTab,
} from "./reports.founder-dependency";

export const Route = createFileRoute("/reports/founder-dependency-preview")({
  head: () => ({ meta: [{ title: "Founder Dependency (Sample) — Revenue Health Visualiser" }] }),
  component: Page,
});

// Hardcoded illustrative sample — not any real user's data.
const ILLUSTRATIVE_SYSTEMS: FDSystem[] = [
  { code: "CONV", name: "Conversion", color: "#F05223", type: "dangerous", level: 82, handoffReadiness: "Low", narrative: null },
  { code: "LFC", name: "Lifecycle", color: "#8B5CF6", type: "dangerous", level: 64, handoffReadiness: "Low", narrative: null },
  { code: "VIS", name: "Visibility", color: "#F59E0B", type: "mixed", level: 48, handoffReadiness: "Moderate", narrative: null },
  { code: "POS", name: "Positioning", color: "#3B82F6", type: "healthy", level: 30, handoffReadiness: "High", narrative: null },
  { code: "AUTH", name: "Authority", color: "#10B981", type: "healthy", level: 22, handoffReadiness: "High", narrative: null },
];

const ILLUSTRATIVE_PROCESSES: FDProcess[] = [
  { code: "CONV", systemName: "Conversion", name: "Approves all discounts and pricing exceptions", type: "dangerous", risk: 5, difficulty: "easy", window: "immediate", whyDependent: "No documented pricing authority matrix. Every non-standard deal requires founder sign-off before it can close.", firstStep: "Draft a tiered pricing authority matrix defining what AEs and managers can approve without escalation." },
  { code: "CONV", systemName: "Conversion", name: "Reviews and signs every contract", type: "dangerous", risk: 4, difficulty: "medium", window: "1-7 days", whyDependent: "Legal review and final sign-off both run through the founder, with no delegated authority above a small deal threshold.", firstStep: "Set a deal-size threshold below which a sales lead can sign using an approved template." },
  { code: "LFC", systemName: "Lifecycle", name: "Handles all escalated customer renewals", type: "dangerous", risk: 4, difficulty: "medium", window: "7-30 days", whyDependent: "Customer success escalates any renewal with friction directly to the founder rather than a defined playbook.", firstStep: "Document a renewal escalation playbook with clear criteria for what CS can resolve independently." },
  { code: "LFC", systemName: "Lifecycle", name: "Only person who understands the churn model", type: "dangerous", risk: 5, difficulty: "hard", window: "30-90 days", whyDependent: "The at-risk scoring logic lives in the founder's head and a personal spreadsheet, not in the CS platform.", firstStep: "Codify the churn scoring criteria and migrate it into the CS platform with a named process owner." },
  { code: "VIS", systemName: "Visibility", name: "Builds the monthly board reporting deck", type: "dangerous", risk: 3, difficulty: "medium", window: "7-30 days", whyDependent: "No standard KPI dashboard exists, so the founder manually assembles reporting from several disconnected tools each month.", firstStep: "Stand up a lightweight KPI dashboard so reporting pulls automatically instead of being assembled by hand." },
  { code: "POS", systemName: "Positioning", name: "Sets overall company vision and strategy", type: "healthy", risk: 1, difficulty: "easy", window: "30-90 days", whyDependent: "Appropriate founder ownership — vision and strategy setting is founder work at this stage.", firstStep: "No action needed. Revisit as the leadership team matures." },
  { code: "AUTH", systemName: "Authority", name: "Represents the company at industry events", type: "healthy", risk: 1, difficulty: "easy", window: "30-90 days", whyDependent: "Founder-led market presence is expected and valuable at this stage of the business.", firstStep: "No action needed. Consider building a secondary spokesperson as the team grows." },
];

const overallIndex = Math.round(
  ILLUSTRATIVE_SYSTEMS.reduce((s, sys) => s + sys.level, 0) / ILLUSTRATIVE_SYSTEMS.length,
);

function Page() {
  const [activeTab, setActiveTab] = useState<"overview" | "systems" | "timeline" | "actions">("overview");

  const TABS: { id: typeof activeTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "systems", label: "System by System" },
    { id: "timeline", label: "Blast Radius" },
    { id: "actions", label: "Action Plan" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <IllustrativeDataBanner note="Your real Founder Dependency analysis requires the Revenue Health Diagnostic™." />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE HEALTH MATRIX™ › FOUNDER DEPENDENCY
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "Instrument Serif, Georgia, serif", fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>
              Founder Dependency Analysis
            </h1>
            <p style={{ fontFamily: "Inter", fontSize: 14, color: T.mid, margin: 0, lineHeight: 1.65, maxWidth: 540 }}>
              Every business has founder dependency. The question is whether it is strategic and temporary, or structural and dangerous. This sample shows what your analysis will include — with sample data, not yours.
            </p>
          </div>
          <DependencyRing score={overallIndex} />
        </div>

        <div style={{ display: "flex", gap: 2, background: T.offWhite, borderRadius: 10, padding: 4, marginBottom: 28, width: "fit-content" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                background: activeTab === tab.id ? T.white : "transparent",
                color: activeTab === tab.id ? T.ink : T.mid,
                fontFamily: "Inter", fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
                boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 14 }}>
                HEALTHY VS DANGEROUS DEPENDENCY
              </div>
              <DependencySplit processes={ILLUSTRATIVE_PROCESSES} systems={ILLUSTRATIVE_SYSTEMS} />
            </div>

            <div style={{ background: T.white, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(24,40,41,0.05)" }}>
              <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 16 }}>
                DEPENDENCY BY SYSTEM
              </div>
              {ILLUSTRATIVE_SYSTEMS.map((dep) => (
                <div key={dep.code} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dep.color }} />
                      <span style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, color: T.ink }}>{dep.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 700, color: T.mid }}>{dep.level}</span>
                  </div>
                  <div style={{ height: 8, background: T.offWhite, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${dep.level}%`, background: dep.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "systems" && (
          <SystemsTab systems={ILLUSTRATIVE_SYSTEMS} processes={ILLUSTRATIVE_PROCESSES} isDiagnostic={false} />
        )}

        {activeTab === "timeline" && (
          <div style={{ background: T.white, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 28, boxShadow: "0 2px 8px rgba(24,40,41,0.05)" }}>
            <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 14 }}>
              BLAST RADIUS TIMELINE
            </div>
            <h2 style={{ fontFamily: "Instrument Serif, Georgia, serif", fontSize: 20, fontWeight: 400, color: T.ink, margin: "0 0 6px" }}>
              If you stepped back today.
            </h2>
            <BlastRadiusTimeline processes={ILLUSTRATIVE_PROCESSES} systems={ILLUSTRATIVE_SYSTEMS} />
          </div>
        )}

        {activeTab === "actions" && (
          <div style={{ background: T.white, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 28, boxShadow: "0 2px 8px rgba(24,40,41,0.05)" }}>
            <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 14 }}>
              ACTION PLAN
            </div>
            <h2 style={{ fontFamily: "Instrument Serif, Georgia, serif", fontSize: 20, fontWeight: 400, color: T.ink, margin: "0 0 6px" }}>
              Reduce dependency, one process at a time.
            </h2>
            <ActionPlan processes={ILLUSTRATIVE_PROCESSES} systems={ILLUSTRATIVE_SYSTEMS} />
          </div>
        )}

        <div
          style={{
            background: T.abyss, borderRadius: 14, padding: "20px 24px", marginTop: 28,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}
        >
          <div style={{ color: T.white, fontFamily: "Inter", fontSize: 13 }}>
            Ready for your real dependency analysis with consultant observations?
          </div>
          <a
            href="https://marketplacemaven.com"
            target="_blank"
            rel="noreferrer"
            style={{
              background: T.ember, color: T.white, borderRadius: 8, padding: "10px 18px",
              fontFamily: "Inter", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}
          >
            Learn about the Diagnostic™
          </a>
        </div>

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, fontSize: 11, fontFamily: "Inter", color: T.mid, marginTop: 28 }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
