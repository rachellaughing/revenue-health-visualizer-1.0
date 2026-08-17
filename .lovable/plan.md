# Revenue System Health — additive layer

Everything checked against live code and the database. No mismatches found:

- `loadCoreData` already fetches `report_narratives` (`exec_headline`, `exec_body`) and `assessment_scores.is_soft_shadow` / `is_hard_shadow` — both are fetched and unused by `getRevenueSystemHealth`.
- `revhealth2.scoring_config` really holds `shadow.soft` = `{health_gte:60, tracking_lt:40}` and `shadow.hard` = `{health_gte:60, tracking_lt:20}`, in columns `config_key` / `config_value`.
- `src/lib/report-links.ts` already exists as the Top Opportunities deep-link boundary.

Untouched: parent narratives, evidence-gap legend, Confidence column, Starter-tier locking, Matrix Map and Top Opportunities routes.

## 1. Server function changes (`src/lib/report.functions.ts`)

Types:
- `ChildSystemScore`: drop `isShadow`, add `isSoftShadow: boolean` and `isHardShadow: boolean`.
- `RevenueSystemHealth`: add `keyFinding: { headline; body; source: "cached" | "fallback" } | null` and `shadowThresholds: { soft: { healthGte; trackingLt }; hard: { healthGte; trackingLt } }`.

`getRevenueSystemHealth`:
- Child mapping reads `s.is_soft_shadow` / `s.is_hard_shadow` directly; the inline `health >= 60 && tracking < 40` recomputation is deleted.
- One new query: `revhealth2.scoring_config` filtered to `shadow.soft` / `shadow.hard`, with the documented values as fallback if a row is missing; passed through as `shadowThresholds`.
- `keyFinding` from the already-loaded `core.narrative` when both `exec_headline` and `exec_body` exist (`source: "cached"`); otherwise the deterministic fallback below (`source: "fallback"`). No AI call, no `generateReportNarrative`.

Fallback, computed from parent aggregates already in scope: rank assessed parents by `healthScore`, take strongest and weakest.
- Headline: `"{strongest} is your strongest system. {weakest} needs the most attention."`
- Body: names the weakest system's score; appends the counts clause only if critical count or shadow count is greater than 0, otherwise the clause is dropped.

## 2. Route changes (`src/routes/reports.revenue-system-health.tsx`)

Key-finding banner, eyebrow "What this report is telling you", rendered above the existing content.

New cross-parent section above the per-parent accordions, built entirely from `systems[].children[]` — no new query:
- Portfolio stats row: assessed count, operating strongly, needing attention (critical + fragile), shadow risks (soft + hard).
- Two filter toggles: "Weak systems" (critical/fragile) and "Unconfirmed strengths" (`isSoftShadow || isHardShadow`).
- Expandable rows with parent-level "What happens when this is weak" / "What to consider" one-liners per parent system, plus the two deep links. No score, no rank — Top Opportunities remains the ranking surface.
- Collapsible "What may be driving these scores" panel using the supplied copy verbatim, held in a small constants file next to the route; weak-system bullets under the weak filter, shadow bullets under the unconfirmed-strengths filter.

Shadow UI:
- Compact row shows the shared "Shadow Risk" label for either flag.
- Expanded explanation states which rule fired (soft or hard) and shows health, tracking, evidence gap and the applicable threshold, read from `shadowThresholds`.
- `illustrativeForChild` rows are classified with the same fetched thresholds instead of their own hardcoded check, so illustrative rows can now also read as hard shadow.

Deep links keyed on `child_system_id`:
- Matrix Map: plain `/revenue/matrix-map`, no child param — the route has no param contract yet.
- Top Opportunities: through a resolver added to `src/lib/report-links.ts` that returns `string | null`; when it returns null the link is hidden rather than guessed.

## Verification

Type-check, then load the page for a Pro assessment: banner renders from cached narrative, shortlist counts reconcile with the accordion rows, shadow badges match `assessment_scores` flags, and thresholds in the expanded copy match the config values.
