## Problem

The returning-user Dashboard panel (`ReturningView` in `src/routes/dashboard.tsx`, ~line 743) shows parent-system scores from `getIllustrativeScores(latest.id)` — a deterministic fake generator on a 0–4 scale. The Executive Summary reads real rolled-up parent scores from `assessment_scores` via `getExecutiveSummary` (`src/lib/report.functions.ts`), which returns `systems: ParentScore[]` with `healthScore` on a 0–100 scale and `overallScore` on the same scale. Same assessment, two different numbers.

## Fix

Reuse the Executive Summary's exact query in the Dashboard widget — no new server function, no duplicated aggregation.

### `src/routes/dashboard.tsx` — `ReturningView` only

1. Add `useQuery` + `useServerFn` calls mirroring `reports.executive-summary.tsx`:
   ```ts
   const fetchSummary = useServerFn(getExecutiveSummary);
   const { data: summary } = useQuery({
     queryKey: ["report", "executive-summary"],
     queryFn: () => fetchSummary({ data: {} }),
   });
   ```
   Share the queryKey with the Executive Summary route so both surfaces hit one cache entry.
2. Derive the panel data from `summary.systems` (ParentScore[]) and `summary.overallScore`:
   - `overall = summary.overallScore` (0–100)
   - Per-parent rows map from `summary.systems`, using `healthScore` (0–100), `name`/`code` for label, and the existing brand color lookup by parent `code` (POS/AUTH/CONV/LFC/VIS → the `--mm-sys-*` tokens already used elsewhere).
   - `weakest` = system with lowest `healthScore` among `assessed > 0`; unassessed systems excluded (matches the not-assessed rule already applied in reports).
3. Update `ScoreRing` usage and the per-system bars to a 0–100 scale: `fill = (score / 100) * circ`, bar width `${score}%`, label `score.toFixed(0)` (or `Math.round(score)`), overall label `${Math.round(overall)}`. Keep the existing ring/bar visuals — only the denominator and formatter change.
4. Loading/empty states:
   - While `summary` is loading, render the panel skeleton (reuse existing shell with zeroed bars or a simple pulse — do not fall back to illustrative data).
   - If `summary` returns `{ error: "no_completed_assessment" }`, render the same panel with dashes and hide the weakest-system card, matching how Executive Summary handles the same case.
5. Remove `getIllustrativeScores` / `getOverall` / `SystemScore` imports and usages inside `ReturningView`. Leave `data.overallScore` / `data.hasScores` from `getDashboardData` untouched (used elsewhere; no longer needed here). Do not touch `NewUserView`, tier logic, insight cards' copy, or any other file.

## Out of scope

- Executive Summary, Matrix Map, illustrative-scores helper (still used by the new-user preview if any), Dashboard scoring for the pre-first-Health-Check state, and every other file.
