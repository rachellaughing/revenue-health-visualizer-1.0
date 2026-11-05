import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ShadowSystemItem } from "@/lib/report.functions";
import { IllustrativeDataBanner } from "@/components/reports/PreviewBanner";
import { ShadowCard } from "./revenue.shadow-systems";
import { SYSTEM_COLOR } from "@/lib/system-colors";
import { Card, SectionLabel, Badge, PageShell } from "@/components/ui-mm";

export const Route = createFileRoute("/revenue/shadow-systems-preview")({
  head: () => ({ meta: [{ title: "Shadow Systems™ (Sample) — Revenue Health Visualizer™" }] }),
  component: Page,
});

const ILLUSTRATIVE_SHADOWS: ShadowSystemItem[] = [
  {
    id: "ill-1", name: "Churn Risk Tracker",
    parentSystem: "Lifecycle", parentColor: SYSTEM_COLOR.LFC,
    type: "spreadsheet", keyPerson: "Sarah (CS Lead)",
    compensatesFor: "Customer Success", riskLevel: 5, actionType: "rebuild",
    finding: "Sarah built a Google Sheet 18 months ago that scores churn risk across the customer base. It pulls data manually from three tools and requires Sarah to update it weekly. Three versions exist across the team. No one else fully understands the scoring logic. If Sarah left tomorrow, the company would lose its only early warning system for at-risk accounts.",
    recommended: "Rebuild the churn risk model in your CS platform with documented scoring criteria. Transfer ownership to a process, not a person. Sarah's logic should be codified and version-controlled.",
  },
  {
    id: "ill-2", name: "Onboarding Playbook (Unofficial)",
    parentSystem: "Lifecycle", parentColor: SYSTEM_COLOR.LFC,
    type: "document", keyPerson: "Marcus (Senior CSM)",
    compensatesFor: "Customer Onboarding", riskLevel: 4, actionType: "formalise",
    finding: "Marcus maintains a 47-tab Notion document that new CSMs use to set up accounts. It was never reviewed by leadership and predates the current product by two versions. New hires treat it as authoritative. Three conflicting versions exist. Two onboarding steps in the document reference a feature that was deprecated in Q3.",
    recommended: "Audit the document against the current product. Assign a formal owner. Move to a controlled location with version history. Build a quarterly review cadence into CS operations.",
  },
  {
    id: "ill-3", name: "Deal Desk WhatsApp Group",
    parentSystem: "Conversion", parentColor: SYSTEM_COLOR.CONV,
    type: "messaging", keyPerson: "Founder + 2 AEs",
    compensatesFor: "Sales Process", riskLevel: 5, actionType: "eliminate",
    finding: "Pricing exceptions, non-standard terms, and discount approvals are handled in a WhatsApp group between the founder and two account executives. No documentation, no audit trail, no defined criteria for what qualifies for an exception. The group has been active for 14 months and contains 847 messages. Three deals in the last quarter were approved at non-standard pricing with no record in the CRM.",
    recommended: "This shadow system exists because a formal pricing authority matrix does not. Eliminate the WhatsApp process and replace it with a tiered approval framework in the CRM. Define what AEs can approve independently, what requires manager sign-off, and what escalates to the founder.",
  },
  {
    id: "ill-4", name: "Prospect Research Template",
    parentSystem: "Positioning", parentColor: SYSTEM_COLOR.POS,
    type: "document", keyPerson: "Jamie (BDR)",
    compensatesFor: "ICP Definition", riskLevel: 3, actionType: "document",
    finding: "Jamie created a prospect research template that the BDR team uses to qualify inbound leads. It was built from Jamie's personal understanding of the ICP after 6 months in the role. The template has never been reviewed against the official ICP definition (which itself has not been updated in 11 months). The BDR team is qualifying leads against a shadow version of the ICP, not the official one.",
    recommended: "Review Jamie's template against the current ICP criteria. Where Jamie's template is better, update the official ICP definition. Where the official definition is more accurate, update the template. Then document it officially and add it to BDR onboarding.",
  },
];

function PBJDivider() {
  return (
    <div className="my-9">
      <div className="mm-row mm-gap-md mb-7">
        <div className="mm-rule" />
        <Badge tone="solid-dark">HOW WE FIND YOURS</Badge>
        <div className="mm-rule" />
      </div>

      <Card variant="dark" className="mm-grid mm-grid--2 mm-gap-xl">
        <div>
          <SectionLabel>REVENUE HEALTH DIAGNOSTIC™</SectionLabel>
          <h3 className="mm-heading-lg mb-3.5">
            The 4 shadow systems above are illustrative. Your business has its own.
          </h3>
          <p className="mm-body mm-on-dark-muted mb-4">
            Shadow systems do not appear in any Health Check score. They exist in the gaps between what your org chart says and how work actually gets done. The only way to surface them is to go looking — deliberately, with the right questions and the right people in the room.
          </p>
          <p className="mm-body mm-on-dark-muted mb-5">
            We do this through a series of PBJ Sessions — a structured facilitation methodology that makes the invisible visible.
          </p>
          <a href="https://marketplacemaven.com/core-concepts/pbj-session/" target="_blank" rel="noopener noreferrer" className="mm-link-bright">
            What is a PBJ Session? →
          </a>
        </div>

        <Card variant="glass">
          <SectionLabel className="mb-3.5">WHAT HAPPENS IN A PBJ SESSION</SectionLabel>
          <div className="mm-stack mm-gap-md">
            {[
              "We sit with your team — not just leadership — and ask them to walk us through how things actually work, not how they should work.",
              "We follow the gaps. When a process relies on a specific person, a specific file, or institutional memory, we dig deeper.",
              "We document what we find. Every shadow system gets a name, an owner, a risk assessment, and a recommended action.",
              "We bring it back to you. The Founder Dependency and Shadow Systems reports are built from what we find in these sessions.",
            ].map((text, i) => (
              <div key={i} className="mm-row mm-row--top">
                <div className="w-5 shrink-0 pt-px text-[10px] font-bold text-[var(--mm-teal-bright)]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="m-0 text-xs leading-[1.65] text-[color-mix(in_srgb,var(--mm-on-dark)_60%,transparent)]">{text}</p>
              </div>
            ))}
          </div>
        </Card>
      </Card>
    </div>
  );
}

function DiagnosticCTA() {
  return (
    <Card variant="ember" className="mm-grid mm-grid--main-aside mm-gap-lg mt-2">
      <div>
        <div className="mm-eyebrow mb-2 text-[color-mix(in_srgb,var(--mm-white)_70%,transparent)]">UNLOCK YOUR SHADOW SYSTEMS</div>
        <h3 className="mm-heading-md mb-1.5 text-[var(--mm-white)]">
          Find out what your business is running on that nobody knows about.
        </h3>
        <p className="m-0 text-[13px] leading-[1.6] text-[color-mix(in_srgb,var(--mm-white)_85%,transparent)]">
          The Revenue Health Diagnostic™ surfaces every shadow system in your business — with a named owner, risk assessment, and concrete action for each one.
        </p>
      </div>
      <div className="mm-stack mm-gap-sm shrink-0">
        <Link to="/diagnostic" className="inline-block whitespace-nowrap rounded-[10px] bg-[var(--mm-white)] px-6 py-3 text-center text-[13px] font-bold text-[var(--mm-ember)] no-underline">
          Book a Diagnostic →
        </Link>
        <a href="https://marketplacemaven.com/diagnostic" target="_blank" rel="noopener noreferrer"
          className="inline-block text-center text-xs text-[color-mix(in_srgb,var(--mm-white)_90%,transparent)] no-underline">
          Learn more first →
        </a>
      </div>
    </Card>
  );
}

function Page() {
  const [expandedId, setExpandedId] = useState<string | null>("ill-1");

  return (
    <PageShell narrow before={<IllustrativeDataBanner note="Your real shadow systems are identified during a Diagnostic session." />}>
      <div className="mm-breadcrumb">REVENUE INTELLIGENCE › SHADOW SYSTEMS™</div>

      <div className="mb-8">
        <h1 className="mm-heading-xl mb-2.5">Shadow Systems™</h1>
        <p className="mm-body mm-body--lg mm-muted max-w-[580px]">
          Shadow systems are the undocumented infrastructure your business actually runs on — spreadsheets, Google Docs, WhatsApp threads, and institutional knowledge that exist in the gaps between your org chart and operational reality. They work until they don't.
        </p>
      </div>

      <div className="mm-row mm-gap-sm mb-5">
        <Badge tone="neutral">ILLUSTRATIVE EXAMPLES</Badge>
        <span className="text-xs mm-muted">
          Based on shadow systems commonly found in businesses like yours. Yours will be different.
        </span>
      </div>

      {ILLUSTRATIVE_SHADOWS.map((s) => (
        <ShadowCard key={s.id} shadow={s}
          expanded={expandedId === s.id}
          onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
      ))}

      <PBJDivider />
      <DiagnosticCTA />

      <div className="mm-footer">© 2025 Marketplace Maven. All rights reserved.</div>
    </PageShell>
  );
}
