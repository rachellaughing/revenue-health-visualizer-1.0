# Matrix Map redesign

Note on the attachment: `matrix-map-interactive-mockup.html` did not arrive with this message — the uploads folder has the earlier `revenue-matrix-explorer-FINAL-v2.html` and `rhv-matrix-map.jsx`, but not the new mockup. I've planned against your written spec and the existing page. If the mockup adds layout detail beyond what's below, re-attach it and I'll fold it in before building.

## What stays as-is

Radial parent layout, zoom animation, the parent-level upstream/downstream `ConnPanel`s, the child grid inside `ZoomedSystem`, and the 8-path chain content and order. None of that gets rebuilt.

## 1. Relationship data — `revhealth2.dependency_map`

Fetched in `getMatrixMap` alongside the existing framework queries. Both `direct_dependencies` and `downstream_systems_influenced` are pipe-delimited; split on `|`, trim, lowercase, match against the same normalized `child_systems.name` map `failure_map` already uses.

A single resolver returns `{ resolved: ChildInfo[], unresolved: string[] }` per field, so unresolved values stay as data rather than being discarded — a future "Business outcomes influenced" section can read them without touching the resolver. Unresolved values are collected into one server-side `console.warn` summary per request, never surfaced in the UI, never thrown.

I audited every value in the table: 50 rows, and exactly one value across all 200+ entries fails to resolve — "Executive Decision Making" — which is the documented business outcome you named. No naming mismatches exist today.

## 2. Two "Mutual" definitions

**Child level** — heading "How this child system affects other systems". Resolve the selected child's two fields, group targets by parent system, drop the child's own parent. Per external parent: Upstream if it only appears via dependencies, Downstream if only via influenced, Mutual only when that one child has both directions with that parent. Each row names the specific child systems it goes through.

Checked against your example: Competitive Positioning's dependencies (Market Position, Differentiation, Value Proposition, ICP) are all Positioning children so they drop out; influenced is Sales Process, Pricing Strategy, Forecasting — Pricing Strategy is Positioning and drops out, leaving Lifecycle (via Sales Process, Downstream) and Visibility (via Forecasting, Downstream). Matches exactly.

**Parent level** — heading "How these systems influence one another". Aggregate every child of the selected parent. External parent is Upstream if any of its children feeds any selected-parent child, Downstream if any selected-parent child feeds any of its children, Mutual if both — even through different child pairs. Computed separately from the child-level logic, not shared.

Both are computed server-side in `getMatrixMap` and returned as new payload fields (`childRelationships`, `parentRelationships`), keyed by child id and parent code.

## 3. Recommended actions

`opportunity_actions` has landed (table exists, with the cache-then-generate-with-Claude pattern in `getTopOpportunities`). The generator is extracted into a shared helper and called from a new server function `getChildSystemActions({ assessmentId, childSystemId })` — same table, same cache key, same model, second entry point. Called lazily when a child system is selected on the Matrix Map, so any of the 50 can populate a row.

Until a row exists, the card falls back to Roadmap Builder's `ROADMAP_CONTENT[code] ?? defaultContent(...)`, so the section is never empty.

## 4. Top Opportunities deep-link

A single exported `topOpportunityRoute(childSystemId, code)` in a new `src/lib/report-links.ts` — the one place to update once the Top Opportunities rebuild finalizes its contract. The button renders only when a matching opportunity exists for that child system (matched on `child_system_id`). No match, no button — never a link to the report top.

## 5. Roadmap lock button

Lock icon + "Add to Roadmap" + "Available with Diagnostic". Tier comes from calling `getCurrentTier()` directly (not `useDiagnosticTierGate`, which redirects whole pages). Non-Diagnostic users get a genuinely inert control, not disabled styling over a live action.

## 6. Static content accordion

The existing "Key Cause & Effect Chains" block moves verbatim into a collapsed-by-default disclosure labelled "How the Revenue Health Matrix works", supporting line "See the cause-and-effect pathways behind the Matrix.", and the opening paragraph you supplied shown when expanded. Button-based, `aria-expanded` / `aria-controls`, keyboard operable. Content and order untouched, and it appears only at the top level — not repeated in any drill-down.

## Technical notes

- `src/lib/report.functions.ts`: add the `dependency_map` query and resolver to `getMatrixMap`; extend `MatrixMapData` with `childRelationships` / `parentRelationships`; extract the opportunity-copy generator into a shared helper; add `getChildSystemActions`.
- `src/lib/report-links.ts`: new, holds the Top Opportunities route seam.
- `src/routes/revenue.matrix-map.tsx`: relationship panels at both levels, actions card, locked roadmap button, accordion. Brand tokens and existing mobile behaviour preserved.
- No schema changes.
