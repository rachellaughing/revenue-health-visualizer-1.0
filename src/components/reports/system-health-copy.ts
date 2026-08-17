/**
 * Static, category-level copy for the Revenue System Health attention shortlist.
 * Deliberately generic — these are common patterns, never a diagnosis of the
 * specific customer viewing the page. Not stored in the database.
 */

export const DRIVERS_COPY = {
  heading: "What may be driving these scores",
  qualifier:
    "These are common patterns behind scores like yours—not confirmed diagnoses. Use them as prompts for a more honest internal conversation.",
  weak: [
    "Ownership is unclear or the system still depends on the founder stepping in.",
    "The process exists informally but cannot be repeated consistently by other people.",
    "Teams optimize their own part without seeing what breaks downstream.",
    "There is no regular feedback loop to expose drift, friction, or failure.",
  ],
  shadow: [
    "Results are supported by anecdotes rather than consistent measures.",
    "The system works because one person carries it, not because the process is documented.",
    "Teams use different definitions, tools, or sources of truth.",
    "Activity is visible, but its connection to revenue outcomes is not.",
  ],
} as const;

/** One-sentence, plain-language impact/fix lines per parent system. */
export const PARENT_IMPACT: Record<string, { weak: string; consider: string }> = {
  POS: {
    weak: "Buyers struggle to see why you are different, so deals stall on price and comparison.",
    consider: "Agree one sharp statement of who you are for and what you replace, then use it everywhere.",
  },
  AUTH: {
    weak: "You have to earn trust from scratch in every conversation, which slows everything downstream.",
    consider: "Publish proof — results, references, points of view — on a predictable cadence rather than ad hoc.",
  },
  CONV: {
    weak: "Good demand leaks out of the pipeline before it becomes revenue.",
    consider: "Write down the steps a deal must pass through and check where they actually break.",
  },
  LFC: {
    weak: "Revenue you already won quietly erodes through churn, weak expansion and slow onboarding.",
    consider: "Define what a healthy customer looks like at 30, 90 and 180 days and review against it.",
  },
  VIS: {
    weak: "Decisions get made on instinct because the numbers arrive late, partial or contested.",
    consider: "Pick a small set of measures with one owner and one source of truth, and review them on a set cadence.",
  },
};

export const SHORTLIST_COPY = {
  eyebrow: "What this report is telling you",
  heading: "Systems that need your attention",
  lede:
    "A shortlist to help you navigate this report. Priority and ranking still live in Top Opportunities.",
  weakFilter: "Weak systems",
  shadowFilter: "Unconfirmed strengths",
  whenWeak: "What happens when this is weak",
  whatToConsider: "What to consider",
  empty: "Nothing matches this filter in your current results.",
} as const;
