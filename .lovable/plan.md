## Goal
Remove the old static tier bar above the FrameworkExplainer on the Health Check page and update the FrameworkExplainer component's copy/stat row to use "evaluation areas" consistently, with tier-specific Starter annotations.

## Changes

### 1. `src/routes/health-check.index.tsx`
- Remove the entire "Tier indicator bar" `<div>` (lines ~1362–1404) that currently sits directly above the FrameworkExplainer.
- This bar is redundant now that FrameworkExplainer collapsibly shows the same tier/selection info.

### 2. `src/components/FrameworkExplainer.tsx`

#### Copy updates: "questions" → "evaluation areas"
- Collapsed bar label: change `{totalQuestions} questions` to `{totalQuestions} evaluation areas`.
- Expanded Snapshot summary:
  - Starter tier: change `{totalQuestions} questions` to `{totalQuestions} evaluation areas`.
  - Pro/Diagnostic tier: change `200 questions` to `200 evaluation areas`.
- Rename the internal `totalQuestions` variable to `totalEvaluationAreas` to match the new terminology.

#### Stat row updates
Change the hard-coded stat array from:
```
["5", "SYSTEMS"], ["10", "SUBSYSTEMS EACH"], ["200", "QUESTIONS TOTAL"]
```
to a richer structure that supports per-item styling and tier-specific annotations:

- **5 / SYSTEMS**
  - Number color: full `C.paper`
  - Label color: muted `rgba(255,254,250,0.5)`
  - No annotation for any tier

- **10 / SUBSYSTEMS EACH**
  - Number color: muted `rgba(255,254,250,0.5)`
  - Label color: muted
  - Annotation (Starter only): `"3 in your Snapshot"` in accent teal (`C.tealBright`)

- **200 / EVALUATION AREAS**
  - Number color: muted `rgba(255,254,250,0.5)`
  - Label color: muted
  - Annotation (Starter only): `"60 in your Snapshot"` in accent teal (`C.tealBright`)

The annotation renders beneath the label in the same column, keeping the existing three-column flex layout and dividers intact.

## Non-goals
- No changes to the chip picker, assessment state, or DB writes.
- No changes to the Dashboard placement of FrameworkExplainer.
- No changes to CSS variables or global styles.
