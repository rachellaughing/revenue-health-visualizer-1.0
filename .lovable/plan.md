## Scope

Add `calculateAssessmentScores` server fn and wire it into the Health Check completion handler. No UI changes.

## Schema check — required before build

`public.assessment_scores` exists with the exact columns the prompt specifies. ✅

`public.assessments` columns currently are:
`id, user_id, profile_id, assessment_type, status, started_at, completed_at, created_at, updated_at, assessment_version, submitted_at, selected_child_ids, tier_at_start, completion_pct`

**Missing**: `overall_health_score`, `overall_tracking_score`, `calculated_at`.

Per the prompt ("if not, report back before adding them") — flagging before proceeding.

## Proposed resolution

Run a small migration adding three columns to `public.assessments`:

```sql
ALTER TABLE public.assessments
  ADD COLUMN overall_health_score numeric,
  ADD COLUMN overall_tracking_score numeric,
  ADD COLUMN calculated_at timestamptz;
```

No RLS / grant changes (table already configured).

## Implementation (after migration approved)

### 1. New server fn `calculateAssessmentScores`
File: `src/lib/healthcheck.functions.ts` (append).

- `createServerFn({ method: "POST" })` + `requireSupabaseAuth` + Zod `{ assessmentId: uuid, userId: uuid }`.
- Ownership check: load assessment by id, ensure `user_id === context.userId` and matches `data.userId`; else throw `Forbidden`.
- All DB ops via `supabaseAdmin` (per project knowledge).
- Step 1: single query — `assessment_responses` for `assessment_id`, then in JS join against framework data fetched via three `revhealth2` reads (`questions`, `evaluation_areas`, `child_systems`, `parent_systems`). Filter `health_response > 0` (exclude `-1` skips and nulls).
  - Note: PostgREST cannot cross-schema join, so do framework reads separately and join in memory (same pattern as existing `loadFrameworkAndResponses`).
- Step 2: group by `child_system_id`. For each:
  - `healthScore = avg(health_response/4 * 100)` over rows with non-null health.
  - `trackingScore = avg(tracking_response/5 * 100)` over rows with non-null tracking.
  - `visibilityGap = healthScore - trackingScore`.
  - `isSoftShadow = healthScore >= 60 && trackingScore < 40`.
  - `isHardShadow = healthScore >= 60 && trackingScore < 20`.
  - `severity`: `<40 critical | <60 fragile | <75 stable | else strong`.
  - Round health/tracking/gap to 1 decimal.
  - `console.log('[scores] childCode:', code, 'health:', h, 'tracking:', t)`.
- Step 3: upsert into `assessment_scores` with `onConflict: 'assessment_id,child_system_id'`. Per-child try/catch; log + continue on failure.
- After all children processed: compute averages of child `healthScore` / `trackingScore` and update `assessments` with `overall_health_score`, `overall_tracking_score`, `calculated_at`.
- Throw descriptive error if zero qualifying responses.
- Return `{ ok: true, children: n, overall_health_score, overall_tracking_score }`.

### 2. Wire into completion

In existing `saveResponse` handler, the completion branch already calls `refresh_profile_completion`. Immediately after that (still inside `if (isComplete)`), call the new fn's underlying logic.

Two options:
- (a) Extract a non-serverFn helper `_calculateAssessmentScoresImpl(assessmentId, userId)` and call it directly from `saveResponse` (avoids self-RPC, runs in same server context). Also export the `createServerFn` wrapper for external use per prompt's stated call shape.
- **Chosen**: (a). The prompt's `await calculateAssessmentScores({ data: { assessmentId, userId } })` shape is preserved at the export, but inside `saveResponse` we invoke the helper directly to avoid an in-process HTTP round-trip.

Wrap the call in try/catch — log failures but do not roll back completion.

## Files Touched

- migration (assessments columns)
- `src/lib/healthcheck.functions.ts` — add helper + serverFn export, call from `saveResponse` completion branch

## Out of Scope

- Any UI change
- Report rendering
- Recalculating historical assessments
- Changes to `assessment_responses` writes or completion gating

## Test

Complete a Health Check, then `SELECT * FROM public.assessment_scores WHERE assessment_id = '<id>'` and `SELECT overall_health_score, overall_tracking_score, calculated_at FROM public.assessments WHERE id = '<id>'`.
