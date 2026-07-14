## Goal

Replace the current `NewUserView` in `src/routes/dashboard.tsx` with the 3-row layout from `dashboard-full-2.0.jsx`, including a live interactive subsystem picker that writes to `assessments.selected_child_ids` via the existing server function. `ReturningView` and `TeamMemberDashboard` are untouched.

## Layout

**Row 1 — dark, two columns**
- `HeroCard`: manifesto teaser + 5/10/200 stat row. 10 and 200 rendered greyed (`rgba(255,254,250,0.4)`) with teal annotations "3 in your Snapshot" / "60 in your Snapshot". Starter tier only shows the annotations; Pro/Diagnostic hides them and keeps all three stats bright.
- `SnapshotIncludesCard`: deliverables list — content varies by tier (reuse the existing `TierIncluded` copy map).

**Row 2 — light, two columns (grid: `1fr 320px`)**
- `SubsystemPickerCard` (Starter) or `FullAccessCard` (Pro/Diagnostic) — left column, scrolls with page.
- `GettingStarted` (existing component, unchanged) — right column, `position: sticky; top: 24px` so it stays in view while the picker scrolls.

**Row 3 — full width, single card**
- Short "About the Revenue Health Matrix™" reminder: one-sentence description + inline stat line "5 systems · 10 subsystems each · 4 evaluation areas · 200 total" + right-aligned link "How the Matrix works →" pointing to `https://marketplacemaven.com/revenue-architecture-framework/` with `target="_blank" rel="noopener noreferrer"`. No interactive explorer.
- Nested inside the same card, below a divider: the existing Diagnostic CTA block (pulled from current dashboard, or a simple ember CTA linking to `/diagnostic`).

The existing `FrameworkExplainer` widget is removed from `NewUserView` (its role is now covered by Row 2 + Row 3).

## Selection Picker Behavior (Starter tier)

Component reads canonical framework from `data.framework.parents` + `data.framework.children` (already loaded by `getDashboardData`), rendered in the fixed order Positioning → Authority → Conversion → Lifecycle → Visibility. Pills use each parent's `SYSTEM_COLORS` mapping already defined in `FrameworkExplainer.tsx` (Positioning #3B82F6, Authority #10B981, Conversion #E11D48, Lifecycle #8B5CF6, Visibility #F59E0B) to match the mockup.

State:
- `picks: Record<parentId, childCode[]>` seeded from `data.latestAssessment.selected_child_ids` if present. The stored IDs are UUIDs; map to codes via `data.framework.children` on init.
- Cap: 3 per system (`FREE_LIMIT`-equivalent). Once 3 chosen for a system, remaining pills in that system render disabled/greyed and non-clickable.
- Tapping a selected pill unselects it.
- Live counters: header shows `{total}/15`; per-system row shows `{n} of 3 selected` (teal + bold when 3).
- Info bar copy switches at 15/15 to "All set — 15 of 15 selected · 60 evaluation areas ready to go".

Persistence:
- On every change, debounce 400ms then call `updateSelectedChildIds({ assessment_id, selected_child_ids: codes })`. Codes are sent — the server function already converts to UUIDs.
- If `data.latestAssessment` is null (no assessment row yet), skip the debounced write and defer persistence to Continue-click.

Continue button:
- Disabled until `total === 15`. Label reflects state ("Select N more to continue" vs "Continue to Health Check →").
- On click:
  1. If no assessment id, call `getHealthCheckData()` (creates one on first read) and use its `assessment.id`.
  2. `await updateSelectedChildIds({ assessment_id, selected_child_ids: codes })`.
  3. `router.navigate({ to: "/health-check" })`.
- Uses `useMutation` for loading/disabled state; catch errors into a small inline error line.

## Tier-Conditional Rendering

Read tier from `data.profile.tier` (already resolved by `getDashboardData`, including inherited-owner tier).

- `tier === "starter"` → render `SubsystemPickerCard` as above.
- `tier === "pro" | "diagnostic"` → render `FullAccessCard`:
  - Heading: "You have full access".
  - Body: "All 50 subsystems included — 200 evaluation areas across every system."
  - Static grid of all subsystems as filled "included" pills (no click handler, no cap indicator).
  - Continue button always enabled, no counter, navigates straight to `/health-check`.
  - Hero annotations ("3 in your Snapshot" / "60 in your Snapshot") are suppressed and the greyed stat treatment is dropped (all three stats bright).

## Files touched

- `src/routes/dashboard.tsx` — replace `NewUserView`; add `HeroCard`, `SnapshotIncludesCard`, `SubsystemPickerCard`, `FullAccessCard`, `AboutMatrixCard` local components. Keep `GettingStarted`, `TierIncluded` map (reused by `SnapshotIncludesCard`), `ReturningView`, and `ScoreRing` untouched. Remove the `FrameworkExplainer` import + usage from `NewUserView` only.

No changes to server functions, styles.css, or the Health Check page.

## Non-goals

- No read-only "confirm your picks" landing page between dashboard and Health Check — noted as a separate follow-up.
- No changes to `ReturningView`, `TeamMemberDashboard`, `FrameworkExplainer`, `getDashboardData`, `updateSelectedChildIds`, or CSS tokens.
- Diagnostic CTA content is a plain ember button linking to `/diagnostic`; no new copy/design system.
