# Scoring Correction: 1–5 scale, fixed normalisation, working skip, inconsistency signal

The database does not yet have the new pieces this brief depends on: there is no `scoring_config` table, and no `inconsistency_count` / `is_inconsistent` / `inconsistency_pct` columns on `assessment_scores` or `assessments`. So step 1 is a migration, then the four app changes.

## 1. Database prerequisites (migration)

- Add `inconsistency_count` (int, default 0) and `is_inconsistent` (bool, default false) to `public.assessment_scores`.
- Add `inconsistency_count` (int, default 0) and `inconsistency_pct` (numeric, default 0) to `public.assessments`.
- Create `public.scoring_config` (key text primary key, value jsonb, timestamps) with grants, RLS, and read access for signed-in users; seed:
  - `inconsistency.child_system` → `{"flag_at":2,"severe_at":3,"of":4,"answer_value":3}`
  - `inconsistency.assessment` → `{"flag_at_pct":25}`

If the supplied `MM_RevHealth_v3_scoring_2026-08-14.sql` should be used verbatim instead, paste it and I'll apply that rather than my own version.

## 2. Health scale becomes 1–5

`src/routes/health-check.index.tsx`
- `HEALTH_LABELS` becomes the five-item list with `"Inconsistent"` as the midpoint (line 40). The render loop already uses `val = i + 1`, so no other change to the option row.

`src/lib/healthcheck.functions.ts`
- `saveSchema` and `editSchema`: `health_response` becomes `z.number().int().min(1).max(5).nullable()` (was `min(-1).max(4)`); tracking stays `min(1).max(5).nullable()`.

## 3. Fix the normalisation

In `_calculateAssessmentScoresImpl`, replace the divide-by-scale-length maths with divide-by-steps:

```ts
const HEALTH_MAX = 5, TRACKING_MAX = 5;
bucket.health.push(((r.health_response - 1) / (HEALTH_MAX - 1)) * 100);
if (r.tracking_response !== null)
  bucket.tracking.push(((r.tracking_response - 1) / (TRACKING_MAX - 1)) * 100);
```

Averages, rounding, overall scores, severity bands and shadow thresholds are untouched. Expect scores to drop overall and `is_hard_shadow` to start firing — both intended.

## 4. Skip writes NULL

The UI currently uses `-1` as its in-memory "skipped" marker in ~10 places (progress counts, completion checks, summary rendering) and also sends `-1` to the server, where it fails the DB CHECK.

- Keep `-1` as the client-side sentinel only, so none of the existing skip logic changes.
- In `setHealth`, when the value is the skip sentinel, send `health_response: null` (explicitly, not omitted) with `tracking_response: null` to `saveResponse` / the edit path.
- On load, map any saved response row that exists with `health_response === null` back to the `-1` sentinel, so a skipped question still reads as skipped after a refresh.

## 5. Inconsistency signal

In `_calculateAssessmentScoresImpl`:
- Read thresholds from `public.scoring_config` (`inconsistency.child_system`, `inconsistency.assessment`) at the start, with the documented defaults as fallback if a row is missing.
- While bucketing responses, count answers equal to `answer_value` (3) per child system and in total.
- Per child system, add `inconsistency_count` and `is_inconsistent` (count >= `flag_at`) to the existing `assessment_scores` upsert.
- Per assessment, add `inconsistency_count` and `inconsistency_pct` (count / total answered health questions × 100, rounded to 1dp) to the existing `assessments` update.

Surfacing in the reports (child-system badge, report summary line, Team Alignment callout) is intentionally left out of this change — those touch report routes the brief says not to change here. I'll do them as a follow-up once you confirm the scoring lands correctly.

## Not touched

Tier gating, `child_systems.access_tier`, the service-role `revhealth2` read path, the response-immutability trigger, `evaluation_areas.weight_pct`.

## Verification

- Five options render, midpoint reads "Inconsistent".
- All-1s child system → health 0 / critical; all-5s → 100 / strong.
- High health + tracking all 1s → `is_hard_shadow = true`.
- Skip saves without error and is excluded from scoring.
- 2+ "Inconsistent" areas → `is_inconsistent = true` with the right count; `assessments.inconsistency_pct` matches the share of 3s.
