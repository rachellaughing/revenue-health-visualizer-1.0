import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { RoadmapItem } from "@/lib/report.functions";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import { T, HORIZONS, HorizonSection, MAX_TASKS } from "./revenue.roadmap-builder";

export const Route = createFileRoute("/revenue/roadmap-builder-preview")({
  head: () => ({ meta: [{ title: "Roadmap Builder (Sample) — Revenue Health Visualizer™" }] }),
  component: Page,
});

// Hardcoded illustrative sample — not any real user's data.
type SampleItem = Omit<RoadmapItem, "warnings" | "included" | "selectedTaskIndices">;

const SAMPLE_ITEMS: SampleItem[] = [
  {
    code: "CONV-01", childSystemId: "ill-conv-01", name: "Pricing Authority", parent: "Conversion", parentCode: "CONV",
    color: T.sys.CONV, healthScore: 38, effort: "low", horizon: "quick_win",
    title: "Document a tiered pricing authority matrix",
    why: "Every non-standard deal currently requires founder sign-off, creating a bottleneck in the sales cycle.",
    tasks: ["List every discount/exception approved in the last 90 days", "Define approval tiers for AEs, managers, and founder", "Publish the matrix in the CRM and train the sales team"],
    outcomes: ["Faster deal cycles", "Founder removed from routine approvals"],
    kpis: ["Average days to close", "% of deals requiring founder sign-off"],
  },
  {
    code: "VIS-02", childSystemId: "ill-vis-02", name: "KPI Dashboard", parent: "Visibility", parentCode: "VIS",
    color: T.sys.VIS, healthScore: 45, effort: "medium", horizon: "quick_win",
    title: "Stand up a single source-of-truth KPI dashboard",
    why: "Reporting is currently assembled by hand each month from several disconnected tools.",
    tasks: ["Identify the 8-10 KPIs leadership actually reviews", "Connect data sources to a single dashboard tool", "Retire the manual reporting spreadsheet"],
    outcomes: ["Real-time visibility into revenue health", "Hours saved on monthly reporting"],
    kpis: ["Time to produce monthly report", "Dashboard adoption across leadership"],
  },
  {
    code: "LFC-03", childSystemId: "ill-lfc-03", name: "Renewal Escalation Path", parent: "Lifecycle", parentCode: "LFC",
    color: T.sys.LFC, healthScore: 41, effort: "medium", horizon: "quick_win",
    title: "Build a renewal escalation playbook",
    why: "Any renewal with friction gets escalated straight to the founder instead of following a defined process.",
    tasks: ["Document common renewal objections and responses", "Define what CS can resolve independently vs. escalate", "Train CS team on the new playbook"],
    outcomes: ["Fewer renewals requiring founder involvement", "More consistent renewal outcomes"],
    kpis: ["% of renewals resolved without escalation", "Net revenue retention"],
  },
  {
    code: "LFC-04", childSystemId: "ill-lfc-04", name: "Churn Risk Model", parent: "Lifecycle", parentCode: "LFC",
    color: T.sys.LFC, healthScore: 33, effort: "high", horizon: "30_days",
    title: "Migrate the churn risk model into the CS platform",
    why: "The at-risk scoring logic currently lives in a personal spreadsheet understood by one person.",
    tasks: ["Document the current scoring criteria", "Rebuild the model natively in the CS platform", "Assign a process owner and review cadence"],
    outcomes: ["Early warning system survives staff turnover", "Consistent, auditable risk scoring"],
    kpis: ["Time-to-detection for at-risk accounts", "Churn rate"],
  },
  {
    code: "POS-05", childSystemId: "ill-pos-05", name: "ICP Definition Refresh", parent: "Positioning", parentCode: "POS",
    color: T.sys.POS, healthScore: 52, effort: "medium", horizon: "30_days",
    title: "Reconcile the official ICP with what BDRs actually use",
    why: "The BDR team is qualifying leads against an informal, undocumented version of the ICP.",
    tasks: ["Audit the BDR team's working template against the official ICP", "Update whichever definition is out of date", "Certify the BDR team on the reconciled definition"],
    outcomes: ["Consistent lead qualification", "Higher quality pipeline"],
    kpis: ["MQL-to-SQL conversion rate", "Sales-accepted lead rate"],
  },
  {
    code: "CONV-06", childSystemId: "ill-conv-06", name: "CRM Governance", parent: "Conversion", parentCode: "CONV",
    color: T.sys.CONV, healthScore: 47, effort: "medium", horizon: "90_days",
    title: "Run a CRM governance and pipeline hygiene sprint",
    why: "Stage definitions and required fields are inconsistent, making pipeline data unreliable.",
    tasks: ["Define stage-gate criteria for every pipeline stage", "Set required fields and validation rules", "Clean up historical pipeline data"],
    outcomes: ["Reliable pipeline forecasting", "Faster onboarding for new reps"],
    kpis: ["Forecast accuracy", "Data completeness score"],
  },
  {
    code: "AUTH-07", childSystemId: "ill-auth-07", name: "Positioning Operationalization", parent: "Authority", parentCode: "AUTH",
    color: T.sys.AUTH, healthScore: 55, effort: "medium", horizon: "90_days",
    title: "Embed positioning into the sales motion",
    why: "Messaging exists in decks but hasn't been embedded into day-to-day sales conversations.",
    tasks: ["Audit current sales messaging against positioning docs", "Build a certification process for the sales team", "Update battle cards and objection handling"],
    outcomes: ["Consistent market message", "Improved win rate against key competitors"],
    kpis: ["Win rate", "Message consistency audit score"],
  },
  {
    code: "AUTH-08", childSystemId: "ill-auth-08", name: "Demand Engine Build", parent: "Authority", parentCode: "AUTH",
    color: T.sys.AUTH, healthScore: 36, effort: "high", horizon: "120_days",
    title: "Build a non-founder-owned demand generation engine",
    why: "Demand generation currently depends heavily on the founder's personal network and visibility.",
    tasks: ["Define channel strategy and content calendar", "Set up attribution and reporting", "Transfer day-to-day ownership away from the founder"],
    outcomes: ["Predictable, repeatable pipeline generation", "Reduced founder dependency in demand gen"],
    kpis: ["Pipeline generated per channel", "% of pipeline founder-sourced"],
  },
];

const NINETY_DAY_FOCUS = SAMPLE_ITEMS.filter((i) =>
  ["CONV-01", "VIS-02", "LFC-03"].includes(i.code),
);

function NinetyDayFocusCard({ item, rank }: { item: SampleItem; rank: number }) {
  return (
    <div className="mm-focus-card" style={{ "--sys-color": item.color } as React.CSSProperties}>
      <div className="mm-focus-card__rank">{rank}</div>
      <div>
        <div className="mm-focus-card__title">{item.title}</div>
        <div className="mm-focus-card__meta">{item.parent} System</div>
        <p className="mm-focus-card__why">{item.why}</p>
      </div>
    </div>
  );
}

const ILLUSTRATIVE_ITEMS: RoadmapItem[] = SAMPLE_ITEMS.map((i, idx) => ({
  ...i,
  warnings: [
    "Teams often stop at documenting the process and never change how the work actually runs.",
    "The first version usually reflects how leadership thinks it works, not how it works.",
    "Progress stalls when no single owner is accountable for the change.",
  ],
  included: true,
  selectedTaskIndices: idx < 5 ? [0, 1] : [],
}));

function Page() {
  const [items, setItems] = useState<RoadmapItem[]>(ILLUSTRATIVE_ITEMS);

  function toggleInclusion(item: RoadmapItem) {
    setItems((prev) =>
      prev.map((i) => (i.code === item.code ? { ...i, included: !i.included } : i)),
    );
  }

  function toggleTask(item: RoadmapItem, index: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.code !== item.code) return i;
        const has = i.selectedTaskIndices.includes(index);
        if (!has && i.selectedTaskIndices.length >= MAX_TASKS) return i;
        return {
          ...i,
          selectedTaskIndices: has
            ? i.selectedTaskIndices.filter((n) => n !== index)
            : [...i.selectedTaskIndices, index].sort((a, b) => a - b),
        };
      }),
    );
  }

  return (
    <div className="mm-page-bg">
      <IllustrativeDataBanner note="Your real roadmap is built from your own assessment once you reach the Diagnostic™." />
      <main className="mm-page mm-page--narrow">
        <div className="mm-breadcrumb">REVENUE INTELLIGENCE › ROADMAP BUILDER</div>

        <h1 className="mm-heading-lg mm-text mm-mb-xs">Roadmap Builder</h1>
        <p className="mm-body mm-body--lg mm-muted mm-mb-xl mm-max-520">
          This is a sample roadmap. Select initiatives across each time horizon to see the kind of action items, expected outcomes, and KPIs your real roadmap will include.
        </p>

        <div className="mm-mb-2xl">
          <div className="mm-kicker">YOUR 90-DAY FOCUS (SAMPLE)</div>
          <p className="mm-body mm-muted mm-mb-md">
            Do these three things first. This is opinionated, not a menu — a real 90-Day Focus is derived from your Top Opportunities ranking and current bottleneck.
          </p>
          {NINETY_DAY_FOCUS.map((item, i) => (
            <NinetyDayFocusCard key={item.code} item={item} rank={i + 1} />
          ))}
        </div>

        <div className="mm-kicker">FULL ROADMAP (SAMPLE)</div>
        {HORIZONS.map((horizon) => (
          <HorizonSection
            key={horizon.id}
            horizon={horizon}
            items={items}
            onToggleInclusion={toggleInclusion}
            onToggleTask={toggleTask}
          />
        ))}

        <div className="mm-card--ember mm-grid mm-grid--main-aside">
          <div>
            <div className="mm-kicker">GET YOUR REAL ROADMAP</div>
            <h3 className="mm-ember-title">Turn this sample into a plan built from your own assessment.</h3>
            <p className="mm-ember-body">
              The Revenue Health Diagnostic™ delivers a week-by-week 120-day roadmap with assigned owners, sequenced initiatives, and 90-day review checkpoints with Rachel.
            </p>
          </div>
          <Link to="/diagnostic" className="mm-btn-on-ember">Book a Diagnostic →</Link>
        </div>

        <div className="mm-footer">© 2025 Marketplace Maven. All rights reserved.</div>
      </main>
    </div>
  );
}
