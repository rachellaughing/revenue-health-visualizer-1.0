## Problem

`assessment_scores` rows are only written for subsystems that received at least one qualifying response, so a missing row means "not assessed". But the reports treat any missing/zero score as `healthScore = 0`, which then renders as **Critical**, gets averaged into the parent score, and shows up in Critical counts and rankings. Unanswered subsystems (e.g. Messaging, Value Proposition, etc. under Positioning) should instead render as **Not assessed** and be excluded from all math.

## Fix

### 1. Server aggregation — `src/lib/report.functions.ts`

- `aggregateByParent` (parent health/tracking/gap): already skips null scores, but also needs to skip children entirely absent from `assessment_scores`. Change the parent average to iterate all children under the parent and only push values for ones with a score row (health_score not null). Compute `assessed` as the count of children with a score row, and derive `severity` from the parent's assessed-only average. If a parent has zero assessed children, set `severity = "not_assessed"` and `healthScore = null`.
- `ChildSystemScore`: change `healthScore`/`trackingScore`/`visibilityGap` to `number | null`, add `severity: "critical" | "fragile" | "stable" | "strong" | "not_assessed"`. In the RSH builder (line ~580) return `null` scores and `severity: "not_assessed"` when `!s`.
- `getTopOpportunities` (line ~787): skip unassessed children from the opportunity list entirely (except starter illustrative rows already handled). No unassessed child should appear in the ranked list or Critical count.
- `getRevenueAtRisk` / risk items (line ~955+): filter out unassessed children before scoring/ranking; do not count them toward exposure or Critical totals.
- `getExecutiveSummary` (line ~423+): same — parent averages exclude unassessed children; Critical counts and "top risks" ignore not-assessed subsystems and systems whose entire child set is unassessed.

### 2. Add `"not_assessed"` visual token

- Extend the `severity()` helper in each report page (`reports.revenue-system-health.tsx` line 57, `reports.top-opportunities.tsx` line 38, `reports.revenue-at-risk.tsx` line 81, `reports.executive-summary.tsx` line 57/`severityColor`/`severityBg`) with a `"not_assessed"` branch → label **"Not assessed"**, color `T.mid` (gray `#888880`), bg `rgba(136,136,128,0.10)`.

### 3. Frontend rendering

- **Revenue System Health** (`ChildRow`, line 146+): when `child.severity === "not_assessed"` render "—" for the score number, hide the health/tracking bar and gap number, and show the gray "Not assessed" pill. The parent header keeps its ring/label — if the whole parent is unassessed, show ring value "—" and gray "Not assessed" pill; adjust `weakest`/`hasHighGap` selection to ignore unassessed children.
- **Top Opportunities**: unassessed items are already dropped server-side; keep the "Showing X of Y" counter accurate by counting only assessed items in the denominator too (or leave denominator = total selectable). For starter tier, illustrative behaviour is unchanged.
- **Revenue at Risk**: unassessed items are dropped server-side; adjust `assessedCount` / "flagged subsystems" totals to reflect the assessed set.
- **Executive Summary**: in the parent-systems list, render unassessed parents with "—" and gray "Not assessed" pill; exclude them from `realScores` / `overallScore` averaging and from the Critical/Fragile counts and Top Risks list.

### 4. Starter-tier illustrative flow is untouched

For starter, non-selected children still render blurred illustrative data (that is intentional upsell). Only children that are *selected but have no responses* — and any children on Pro/Diagnostic without responses — flow into the new "Not assessed" state.

## Files changed

- `src/lib/report.functions.ts` — aggregation, `ChildSystemScore` type, opportunity/risk/exec filtering
- `src/routes/reports.revenue-system-health.tsx` — severity helper + ChildRow + SystemSection
- `src/routes/reports.top-opportunities.tsx` — severity helper + counter
- `src/routes/reports.revenue-at-risk.tsx` — severity/risk helpers + counter
- `src/routes/reports.executive-summary.tsx` — severityColor/severityBg + parent list + overall counts

## Out of scope

- No database schema or `calculateAssessmentScores` changes — the "no score row = not assessed" invariant is already correct.
- No changes to Health Check flow, dashboard tiles, or team/alignment reports.
