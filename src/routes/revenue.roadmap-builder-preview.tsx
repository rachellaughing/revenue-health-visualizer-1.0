import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { RoadmapItem } from "@/lib/report.functions";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import { T, HORIZONS, HorizonSection, MAX_TASKS } from "./revenue.roadmap-builder";

export const Route = createFileRoute("/revenue/roadmap-builder-preview")({
  head: () => ({ meta: [{ title: "Roadmap Builder (Sample) — Revenue Health Visualiser™" }] }),
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
    code: "AUTH-07", childSystemId: "ill-auth-07", name: "Positioning Operationalisation", parent: "Authority", parentCode: "AUTH",
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
    <div style={{
      background: T.offWhite, border: "1px solid var(--mm-rule)", borderLeft: `3px solid ${item.color}`,
      borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "grid",
      gridTemplateColumns: "32px 1fr", gap: 16, boxShadow: "0 2px 6px color-mix(in srgb, var(--mm-abyss) 4.0%, transparent)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: `color-mix(in srgb, ${item.color} 9.4%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${item.color} 25.1%, transparent)`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 13, fontFamily: "Inter", fontWeight: 700, color: item.color,
      }}>{rank}</div>
      <div>
        <div style={{ fontSize: 14, fontFamily: "Inter", fontWeight: 600, color: T.ink, marginBottom: 4 }}>{item.title}</div>
        <div style={{ fontSize: 11, fontFamily: "Inter", color: T.mid, marginBottom: 8 }}>{item.parent} System</div>
        <p style={{ fontSize: 12, fontFamily: "Inter", color: T.mid, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{item.why}</p>
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
    <div style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <IllustrativeDataBanner note="Your real roadmap is built from your own assessment once you reach the Diagnostic™." />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE INTELLIGENCE › ROADMAP BUILDER
        </div>

        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>
          Roadmap Builder
        </h1>
        <p style={{ fontFamily: "Inter", fontSize: 14, color: T.mid, margin: "0 0 28px", lineHeight: 1.65, maxWidth: 520 }}>
          This is a sample roadmap. Select initiatives across each time horizon to see the kind of action items, expected outcomes, and KPIs your real roadmap will include.
        </p>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 14 }}>
            YOUR 90-DAY FOCUS (SAMPLE)
          </div>
          <p style={{ fontSize: 13, fontFamily: "Inter", color: T.mid, margin: "0 0 16px", lineHeight: 1.6 }}>
            Do these three things first. This is opinionated, not a menu — a real 90-Day Focus is derived from your Top Opportunities ranking and current bottleneck.
          </p>
          {NINETY_DAY_FOCUS.map((item, i) => (
            <NinetyDayFocusCard key={item.code} item={item} rank={i + 1} />
          ))}
        </div>

        <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 14 }}>
          FULL ROADMAP (SAMPLE)
        </div>
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
          background: T.ember, borderRadius: 16, padding: "28px 32px",
          display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: "color-mix(in srgb, var(--mm-white) 70.0%, transparent)", letterSpacing: "0.12em", marginBottom: 8 }}>
              GET YOUR REAL ROADMAP
            </div>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20, fontWeight: 400, color: T.white, margin: "0 0 6px" }}>
              Turn this sample into a plan built from your own assessment.
            </h3>
            <p style={{ fontFamily: "Inter", fontSize: 13, color: "color-mix(in srgb, var(--mm-white) 75.0%, transparent)", margin: 0, lineHeight: 1.6 }}>
              The Revenue Health Diagnostic™ delivers a week-by-week 120-day roadmap with assigned owners, sequenced initiatives, and 90-day review checkpoints with Rachel.
            </p>
          </div>
          <a href="/diagnostic" style={{
            display: "inline-block", background: T.white, color: T.ember,
            fontFamily: "Inter", fontSize: 13, fontWeight: 700,
            padding: "12px 24px", borderRadius: 10,
            textDecoration: "none", textAlign: "center", whiteSpace: "nowrap",
          }}>Book a Diagnostic →</a>
        </div>

        <div style={{ paddingTop: 24, borderTop: `1px solid ${T.offWhite}`, marginTop: 32, fontSize: 11, fontFamily: "Inter", color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}
