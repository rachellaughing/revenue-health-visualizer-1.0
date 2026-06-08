## Goal
Let users collapse the left "parent systems" rail on the Health Check page (between the app sidebar and the main question column) so the answer area can use more width — mirroring how the app sidebar already collapses.

## Scope
Single file: `src/routes/health-check.index.tsx`, the `HealthCheckShell` component (left nav starts at line ~1316, width 220).

## Behaviour
- New local state `leftRailCollapsed` (default `false`, persisted to `localStorage` under `hc-leftrail-collapsed` so the choice sticks across reloads).
- Collapsed width: `48px`. Expanded width: `220px` (unchanged). Smooth `width` transition (200ms).
- When collapsed:
  - Hide parent name labels, progress bars, percentage, and the expanded child list.
  - Keep the coloured dot (8px) centered as a clickable affordance for each parent — clicking it selects that parent AND auto-expands the rail.
  - Active parent still shows the 3px coloured left border.
- A small chevron toggle button sits at the top of the rail (`«` when expanded, `»` when collapsed). On mobile (<768px) the rail starts collapsed by default.
- Tooltips on each parent dot when collapsed (reuse existing `Tooltip` primitive) showing the parent name + % complete.

## Out of scope
- No change to the app sidebar, top bar, child-system list rendering, or save logic.
- No responsive overhaul of the main column (that was discussed separately).

## Files
- `src/routes/health-check.index.tsx` — add state + toggle button + conditional rendering inside the left-nav `<div>` at line 1316.
