
## Goal

Create one shared `FrameworkExplainer` component and mount it in two places, wired to live selection state (read-only). Do not modify the existing chip picker.

## New component

**File:** `src/components/FrameworkExplainer.tsx`

Adapted from `framework-explainer-v2.jsx` with these changes:

- System colors overridden to:
  - Positioning `#3B82F6`
  - Authority `#10B981`
  - Conversion `#E11D48`
  - Lifecycle `#8B5CF6`
  - Visibility `#F59E0B`
- Subsystem grid is **read-only**: no `onClick`, no `useState` for picks, no toggle logic, no "X of 3 selected" counter, no upgrade CTA row. Tiles just render — filled/bordered when selected, muted outline when not.
- Collapsed bar label: `Revenue Health Snapshot™ · {totalSelected} of 50 subsystems · {totalSelected * 4} questions` followed by the "How it works" affordance and chevron.
- Expanded body keeps: hero line, the `5 systems · 10 subsystems each · 200 questions` stat strip, and a sentence stating the Snapshot covers 3 per system by design.
- Open/closed state is local `useState`, seeded from a `defaultOpen` prop. Persist across mounts on the same tab via `sessionStorage` key `fx-explainer-open:{context}` so navigating between Dashboard and Health Check remembers per-surface state. No DB write.

**Props:**
```ts
type Props = {
  context: "dashboard" | "healthcheck";
  defaultOpen?: boolean;
  // Selection data supplied by parent — component never fetches
  selectedByParent: Record<ParentName, string[]>; // subsystem codes/names selected per system
  systems: Array<{ name: ParentName; subs: string[] }>; // full taxonomy for rendering all tiles
};
```

Component computes `totalSelected = sum of selectedByParent[p].length` and `totalQuestions = totalSelected * 4`.

## Placement 1 — Dashboard

**File:** `src/routes/dashboard.tsx`

- Replace the entire `ConceptCards` render at line ~225 (`<ConceptCards />`) with `<FrameworkExplainer context="dashboard" ... />`. Delete the `ConceptCards` function (lines ~395-447) since it's the "Understanding Your Revenue Health" block being replaced.
- Feed it selection data from the dashboard's existing loader payload. Where the latest assessment is available (`ReturningView`), derive `selectedByParent` from `latest.selected_child_ids` mapped through the framework taxonomy. For `NewUserView` (no assessment yet), pass empty arrays — collapsed bar reads `0 of 50 subsystems · 0 questions`, expanded body still explains the framework.
- `defaultOpen={false}` on Dashboard.

If the framework taxonomy isn't already in the dashboard loader, extend `getDashboardData` in `src/lib/dashboard.functions.ts` to also return the parent/child list (already loaded by the health-check loader — reuse the same query) so the tiles can render without a second round-trip.

## Placement 2 — Health Check

**File:** `src/routes/health-check.index.tsx`

Mount `<FrameworkExplainer context="healthcheck" defaultOpen={false} ... />` directly above the mobile system tab row (around line ~1409, sibling to the tab strip) AND above the desktop rail's tab row — one instance rendered in the body above the tabs container so it applies to both viewports.

Selection source: the existing `selectedCodes` state in `HealthCheckShell` (line ~1010) — it's already the live source of truth for chips. Pass it in mapped by parent. This means the collapsed count updates in real time as the user toggles chips, with zero coupling to the chip UI itself.

Leave the existing yellow "Revenue Health Snapshot™ · 15 subsystems · Upgrade…" banner alone — it's a separate tier badge. The new explainer sits below it, above the tab row.

## Non-goals / guardrails

- No changes to the chip picker component, its state, or DB writes.
- No changes to `--mm-sys-*` CSS variables (already updated in a prior turn).
- No new server functions unless the dashboard loader genuinely lacks taxonomy — prefer extending the existing loader over adding a new fetch.
- `CompletedLanding` on Health Check: out of scope for this turn (that view has its own system tab strip; if you want the explainer there too, say so and I'll add it as a follow-up).
