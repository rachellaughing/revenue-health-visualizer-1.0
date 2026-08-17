/**
 * Single source of truth for every plain-language label on the Top Opportunities page.
 * The numeric opportunity score is internal only and must never be rendered.
 * Swap wording here — nowhere else.
 */
import type { BadgeKey, SeverityBand } from "@/lib/report.functions";

export const BADGE_LABELS: Record<BadgeKey, string> = {
  widest_impact: "Widest impact",
  high_impact: "High impact",
  quick_win: "Quick win",
};

/** TODO(wording): provisional — final severity wording still to be confirmed. */
export const SEVERITY_LABELS: Record<SeverityBand, string> = {
  critical: "Needs attention",
  fragile: "Worth attention",
  stable: "Worth monitoring",
  strong: "Healthy foundation",
};

export const SECTION_COPY = {
  biggestImpactIntro:
    "These are the weaknesses with the widest knock-on effect. Improving one may strengthen several other parts of your revenue engine.",
  quickestWinsIntro:
    "These are practical improvements you may be able to begin without a large rebuild.",
  starterHeadline: "Where to focus next",
  starterLede:
    "These priorities come from the 15 Revenue Systems you selected for your Starter assessment.",
  scopeKicker: "Your current assessment",
  scopeBody:
    "Your rankings only use evaluated systems. The 35 systems you did not assess are shown separately below and are not treated as findings.",
  lockedHeading: "Other areas worth examining",
  lockedSubhead:
    "The full assessment looks at 35 additional systems that may affect how revenue moves through the business.",
  lockedBanner:
    "These are areas to explore, not findings from your current results. They have not been scored, ranked or included in the opportunities above.",
  lockedNotIncluded: "Not included in your current assessment.",
  lockedCta: "Explore the full assessment →",
} as const;

export const QUESTION_LABELS = {
  whatWeSee: "What are we seeing?",
  whyItMatters: "Why does it matter?",
  affectingImpact: "Also affecting",
  affectingQuickWin: "What this could help",
  startHere: "Start here",
} as const;
