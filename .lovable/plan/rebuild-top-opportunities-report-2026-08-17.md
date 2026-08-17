# Rebuild: Top Opportunities report

Turn one 50-row ranked list into a decision page: **Biggest Impact**, **Quickest Wins**, **Other opportunities**, plus a locked "Other areas worth examining" section for Starter users. The ranking formula is untouched; the opportunity score becomes internal-only and never appears as a number.

## Selection logic (server)

Ranking stays exactly as today: `baseScore = 100 - health`, `× (1 + 0.15 × weakCascadeCount)`.

Eligible pool = **evaluated systems only**. For Starter, that is strictly the systems in `assessments.selected_child_ids`; the other 35 can never enter either featured tab.

- **Biggest Impact** — up to 6. Requires: health below the weak threshold, at least one cascade impact that is itself weak, and meaningful documented `influence_score` / `impact_magnitude`. Ranked by opportunity score. No backfill — fewer than 6 if fewer qualify.
- **Quickest Wins** — up to 6. Requires: `child_systems.opportunity_class = 'Quick Win'`, a real health gap (not merely tagged), ordered by `impact_horizon` (Immediate → Short-Term → Medium-Term → Long-Term) then opportunity score. No backfill. No card, badge or copy anywhere will say "low effort" — the existing `effortLevel` / `timeframe` fields are dropped from the UI.
- **Other opportunities** — every remaining evaluated system, grouped by parent system, collapsed by default, name + plain severity label only.

Critical Path membership may render as one supporting context line on a card; it never affects selection or order.

## Card content (AI-generated, cached)

Featured cards answer four questions in fixed order: What are we seeing? / Why does it matter? / What else is it affecting? / What could you do next?

The first, second and fourth come from Claude, generated the same way `report_narratives` already works — direct Anthropic call, `claude-sonnet-4-5-20250929`, one batched request, same tone constraints, same try/catch fallback. New table `public.opportunity_actions` keyed on `(assessment_id, child_system_id)`, with owner-scoped RLS and explicit grants.

Generation is lazy inside `getTopOpportunities`: after featured systems are chosen (≤12), look up cached rows; generate only the missing ones in a single call; upsert; never regenerate an existing row. On failure, the page still renders using the raw `failure_map` text.

"What else is it affecting?" is not AI — it lists `impacted_system_1/2/3` directly: "Also affecting: X, Y, Z" on Impact cards, "What this could help: X and Y" on Quick Win cards.

## Labels

All wording lives in one exported map so it can be swapped in a single edit:

- Biggest Impact: "Widest impact" (rank 1), "High impact" (rest)
- Quickest Wins: "Quick win"
- Other opportunities: current severity bands, worded plainly — "Needs attention" / "Worth attention" / "Worth monitoring" / "Healthy foundation" — marked TODO as provisional.

No numeric score of any kind on featured cards.

## Starter tier

- Headline "Where to focus next"; lede "These priorities come from the 15 Revenue Systems you selected for your Starter assessment."
- Scope banner above the tabs with the exact kicker/body wording supplied, plus an "N / 50 systems evaluated" counter.
- Featured tabs and Other opportunities draw only from the selected systems.
- Below everything, the locked section: heading "Other areas worth examining", the supplied subhead, the exact truth-in-labeling banner, five parent tiles with locked counts, then locked cards showing parent label, lock icon, system name, `customer_facing_description`, and "Not included in your current assessment." No score, severity, rank or badge on locked cards, ever. "Show more" reveals them in batches until all 35 are reachable. CTA "Explore the full assessment →" links to `/settings/billing`.

Paid tiers see no scope banner and no locked section.

## Held back (per your instruction)

- Severity wording marked as provisional in the label map.
- System filter chips not built; the tab shell leaves room to add them.
- Locked-card "what can happen when this is weak" line not built; the card component has a slot for it.

## Technical notes

- `src/lib/report.functions.ts`: extend `getTopOpportunities` to also select `opportunity_class`, `impact_horizon`, `influence_score`, `impact_magnitude`, `customer_facing_description` from `child_systems`, plus critical path membership; return `{ tier, biggestImpact[], quickestWins[], otherOpportunities[], lockedSystems[], counters }` with `opportunityScore` retained internally for sorting but excluded from the client payload.
- New `opportunity_actions` migration + generator function alongside the narrative generator.
- `src/routes/reports.top-opportunities.tsx` rebuilt: tabs, card component, collapsible parent groups, locked section. Existing brand tokens and mobile behaviour preserved.
- Illustrative scores are no longer used to produce anything that reads as a finding.
