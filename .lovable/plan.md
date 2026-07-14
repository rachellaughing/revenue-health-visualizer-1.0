## Scope

Modify `src/routes/health-check.index.tsx` only. Do not touch scoring, `saveResponse`, `advanceToNext`, collapse-on-answer, or `AnswerCard`/`ChildBlock`/`CompletedLanding`. All work is in `HealthCheckShell` + one new component.

---

## 1. Subsystem chip row (in-progress state)

Currently: renders every child in `activeChildren` with `isChildLocked` styling (lock icon, greyed).

Change (Starter tier, `!inSelectionMode`):
- Filter `activeChildren` to only those with `selectedSet.has(c.code)` — max 3.
- Remove all lock UI (`🔒`, disabled state, "not-allowed" cursor, opacity, `isChildLocked` branches for these chips).
- Each chip shows its own progress: `${answeredCount}/${areas.length}` (e.g. `2/4`) using the existing per-area response check (`r.health !== null && r.health > 0 && r.tracking !== null`). Fully done shows `4/4` in teal.
- Active chip: filled tint background (`systemColor + "15"`) + bold border (`1.5px solid systemColor`) + `fontWeight: 700`. Inactive: paper background, sand border.
- Drop the `"X of 3 selected"` counter and the `"Change selection"` inline link. Selection editing now happens via the breadcrumb (§3).

Selection mode (`inSelectionMode` = starter with <3 picks in this system): keep the existing full-list picker chips as-is — the reference is for the answering state, and picking still needs to happen somewhere. (Once 3 chosen the row collapses to §1 above.)

Pro / Diagnostic: no `selected_child_ids` filter — show all 10 chips; each chip shows its own `n/4` progress. No lock UI (never applies).

## 2. Left rail — same filter

Under each parent in the desktop left rail (`!leftRailCollapsed && isActiveParent && list.map…`):
- Starter: filter `list` to `list.filter(c => selectedSet.has(c.code))` before mapping. Drop the `🔒` icon and the `locked ? "not-allowed" : "pointer"` styling.
- Pro / Diagnostic: unchanged (all 10 shown).

Same filter for the mobile tab list children if any (currently only parent-level, no change needed).

## 3. Sticky breadcrumb bar

Replace the existing `<FrameworkExplainer …>` block (lines ~1363–1375) with a new local component `SelectionBreadcrumb`.

Structure (mirrors reference `StickyBreadcrumb`):
- Outer wrapper: `position: sticky; top: 0; z-index: 10; background: paper` — sits below the fixed 52px top bar, above the content row. Since the top bar and current mobile tab strip live in a `flexDirection: column` scroll parent, put the breadcrumb inside the scrolling right panel (move it into `<div style={{ flex: 1, overflowY: "auto" }}>` at line ~1642) so `sticky` works against that scroll container. Render it as the first child of that panel, before the `completedBanner`.
- Collapsed row:
  - Dot cluster: 5 dots, one per parent, using `#${p.color_hex}`, overlapping (marginLeft -2.5, sand ring).
  - Label: `Revenue Health Snapshot™ · **60 evaluation areas**` (bold the number). Compute number as `data.totalUnlockedAreas` so pro/diagnostic reads "200 evaluation areas" and starter reads "60"; product label switches to `Revenue Health Assessment™` / `Revenue Health Diagnostic™` based on `tier`.
  - Right side: `How it works ↗` link to `https://marketplacemaven.com/revenue-architecture-framework/` (`target="_blank"`, `rel="noopener noreferrer"`, `stopPropagation` on click) + chevron (rotates on open).
- Expanded panel (below, seamless border):
  - Heading line: `Here's what you're evaluating — chosen on your Dashboard.` + `Edit selections` link → TanStack `<Link to="/dashboard">`.
  - For each parent (in `parents` order): color dot + name, then a flex-wrap row of filled colored pills — one per selected child, `background: systemColor, color: white, fontWeight: 700`. For pro/diagnostic show all children as pills.

State: `useState(false)` for open; no persistence needed (session-scoped is fine but not required by the spec).

Delete the `FrameworkExplainer` import from this file. (Component itself stays — still used on Dashboard.)

## 4. "Is this a lot?" CTA — once per system

New local component `CavitySearchCTA` matching the reference (dark `T.abyss` card, Instrument Serif heading "Is this a lot?", two paragraphs of copy verbatim from reference lines 343–348, ember button "Learn about the Diagnostic™ →" linking to `/diagnostic`).

Placement logic — inside the areas render block (right panel, after the `activeAreas.map(…)`, before `showSkipWarning`):
- Compute `visibleChildrenForParent`: for starter = `activeChildren.filter(c => selectedSet.has(c.code))`; for pro/diagnostic = `activeChildren`.
- Compute `isLastVisibleChild = visibleChildrenForParent[visibleChildrenForParent.length - 1]?.id === activeChild?.id`.
- Compute `childComplete` (already exists) for the active child.
- Render `<CavitySearchCTA />` only when `isLastVisibleChild && childComplete`.

This gives exactly one appearance per system (5 total across the flow), tied to finishing the last selected subsystem — regardless of tier.

## Files touched

- `src/routes/health-check.index.tsx` — only this file. Remove `FrameworkExplainer` import; add `SelectionBreadcrumb` + `CavitySearchCTA` local components; edit chip row, left-rail child map, and areas-render tail as described.

## Out of scope (explicit)

- `AnswerCard`, `ChildBlock`, `CompletedLanding`, `TeamMemberCompletionInline`.
- `saveResponse` / `updateSelectedChildIds` / scoring / `advanceToNext`.
- Collapse-on-answer behavior for individual areas.
- `FrameworkExplainer.tsx` (kept for Dashboard usage).
- Dashboard, styles.css, server functions.
