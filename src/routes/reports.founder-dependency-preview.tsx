import { createFileRoute } from "@tanstack/react-router";
import { getSystemColor, getSystemClass } from "@/lib/system-colors";
import { Bar } from "@/components/ui-mm";
import { useState } from "react";
import type { FDSystem, FDProcess } from "@/lib/report.functions";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import {
  DependencyRing,
  DependencySplit,
  BlastRadiusTimeline,
  ActionPlan,
  SystemsTab,
} from "./reports.founder-dependency";

export const Route = createFileRoute("/reports/founder-dependency-preview")({
  head: () => ({ meta: [{ title: "Founder Dependency (Sample) — Revenue Health Visualizer" }] }),
  component: Page,
});

// Hardcoded illustrative sample — not any real user's data.
const ILLUSTRATIVE_SYSTEMS: FDSystem[] = [
  { code: "CONV", name: "Conversion", color: getSystemColor("CONV"), type: "dangerous", level: 82, handoffReadiness: "Low", narrative: null },
  { code: "LFC", name: "Lifecycle", color: "var(--mm-sys-lifecycle)", type: "dangerous", level: 64, handoffReadiness: "Low", narrative: null },
  { code: "VIS", name: "Visibility", color: "var(--mm-sys-visibility)", type: "mixed", level: 48, handoffReadiness: "Moderate", narrative: null },
  { code: "POS", name: "Positioning", color: "var(--mm-sys-positioning)", type: "healthy", level: 30, handoffReadiness: "High", narrative: null },
  { code: "AUTH", name: "Authority", color: "var(--mm-sys-authority)", type: "healthy", level: 22, handoffReadiness: "High", narrative: null },
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
    <div className="mm-page-bg">
      <IllustrativeDataBanner note="Your real Founder Dependency analysis requires the Revenue Health Diagnostic™." />
      <main className="mm-page mm-page--wide">
        <div className="mm-breadcrumb">REVENUE HEALTH MATRIX™ › FOUNDER DEPENDENCY</div>

        <div className="mm-grid mm-grid--main-aside mm-row--top mm-mb-xl">
          <div>
            <h1 className="mm-report-title">Founder Dependency Analysis</h1>
            <p className="mm-report-lede">
              Every business has founder dependency. The question is whether it is strategic and temporary, or structural and dangerous. This sample shows what your analysis will include — with sample data, not yours.
            </p>
          </div>
          <DependencyRing score={overallIndex} />
        </div>

        <div className="mm-seg mm-mb-xl" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mm-seg__btn ${activeTab === tab.id ? "mm-seg__btn--on" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div>
            <div className="mm-mb-lg">
              <div className="mm-kicker">HEALTHY VS DANGEROUS DEPENDENCY</div>
              <DependencySplit processes={ILLUSTRATIVE_PROCESSES} systems={ILLUSTRATIVE_SYSTEMS} />
            </div>

            <div className="mm-report-card mm-report-card--sm mm-mb-lg">
              <div className="mm-kicker">DEPENDENCY BY SYSTEM</div>
              {ILLUSTRATIVE_SYSTEMS.map((dep) => (
                <div key={dep.code} className={`mm-sysbar ${getSystemClass(dep.code)}`}>
                  <div className="mm-row mm-row--between mm-mb-xs">
                    <div className="mm-row mm-gap-xs">
                      <span className="mm-sys-dot mm-dot-8" />
                      <span className="text-xs font-semibold mm-text">{dep.name}</span>
                    </div>
                    <span className="text-xs font-bold mm-muted">{dep.level}</span>
                  </div>
                  <Bar pct={dep.level} label={`${dep.name} dependency`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "systems" && (
          <SystemsTab systems={ILLUSTRATIVE_SYSTEMS} processes={ILLUSTRATIVE_PROCESSES} isDiagnostic={false} />
        )}

        {activeTab === "timeline" && (
          <div className="mm-report-card">
            <div className="mm-kicker">BLAST RADIUS TIMELINE</div>
            <h2 className="mm-report-h2">If you stepped back today.</h2>
            <BlastRadiusTimeline processes={ILLUSTRATIVE_PROCESSES} systems={ILLUSTRATIVE_SYSTEMS} />
          </div>
        )}

        {activeTab === "actions" && (
          <div className="mm-report-card">
            <div className="mm-kicker">ACTION PLAN</div>
            <h2 className="mm-report-h2">Reduce dependency, one process at a time.</h2>
            <ActionPlan processes={ILLUSTRATIVE_PROCESSES} systems={ILLUSTRATIVE_SYSTEMS} />
          </div>
        )}

        <div className="mm-cta-band mm-mt-xl">
          <div className="text-[13px]">Ready for your real dependency analysis with consultant observations?</div>
          <a href="https://marketplacemaven.com" target="_blank" rel="noreferrer" className="mm-cta-band__btn">
            Learn about the Diagnostic™
          </a>
        </div>

        <div className="mm-footer">© 2025 Marketplace Maven. All rights reserved.</div>
      </main>
    </div>
  );
}
