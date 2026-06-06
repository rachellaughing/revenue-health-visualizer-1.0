## Scope

Two additions to `/health-check`. No new routes. No changes to question card behaviour, auto-save, or auto-advance logic.

## 1. Tier Indicator Bar

Add a 32px bar directly below the existing 52px top bar, above the body flex row, visible only on this page.

- Background `#F5F5F0`, text Inter 11px `#888880`, full width, centered or left-padded `24px`
- Copy by `data.tier`:
  - `starter` → "Revenue Health Snapshot™ · 15 subsystems · " + teal `#2A6B6E` link "Upgrade for full access ↗" → `/upgrade`
  - `pro` → "Revenue Health Assessment™ · All 50 subsystems unlocked"
  - `diagnostic` → "Revenue Health Diagnostic™ · All 50 subsystems unlocked"

## 2. Inline Subsystem Selection (starter tier only)

### Data layer (`src/lib/healthcheck.functions.ts`)

- Extend `getHealthCheckData` to also select `selected_child_ids` on the assessment row and include it in returned `assessment` object (and `HealthCheckData` type).
- Add new server fn `updateSelectedChildIds({ assessment_id, selected_child_ids: string[] })`:
  - `requireSupabaseAuth`, ownership check identical to `saveResponse`
  - Writes `assessments.selected_child_ids` directly via `supabaseAdmin`
  - Returns `{ ok: true, selected_child_ids }`
- No schema changes — column already exists as `text[]`.

### Selection semantics

The selection is stored as child-system **codes** (per spec: "Save selected codes"). `ChildSystem.code` is already on the returned shape.

Replace the existing `isChildLocked` predicate with a tier-aware version:

```
locked(child) =
  tier !== 'starter'         → false
  selected_child_ids empty   → false (selection mode, all selectable)
  selected_child_ids.length < 3 → false for any not yet selected
  selected_child_ids.length === 3 → !selected.includes(child.code)
```

Selections are scoped per parent system: each parent gets its own 3-subsystem pick. We store all selected codes (across parents) flat in `selected_child_ids`. The "3 per parent" cap is enforced client-side by filtering selected codes against children of the active parent.

### Page state

- `selectedCodes: string[]` initialised from `data.assessment.selected_child_ids ?? []`
- Helper `selectedForParent(parentId)` → codes intersected with that parent's children
- Helper `inProgress(child)` → any `responses[a.question_id]` for that child has non-null health
- `inSelectionMode(parent)` → `tier === 'starter' && selectedForParent(parent.id).length < 3`

### Toggling

On chip click in selection mode (starter only):

- If chip already selected:
  - If `inProgress(child)` → no-op
  - Else → remove from `selectedCodes`, persist
- Else (chip not selected):
  - If `selectedForParent(parent.id).length >= 3` → no-op (chip is locked)
  - Else → add to `selectedCodes`, persist; if this hits 3, set `activeChildId` to first selected child for that parent

On chip click outside selection mode: existing `selectChild` behaviour (locked chips are non-clickable).

Persist via debounced (or immediate) call to `updateSelectedChildIds` and update React Query cache optimistically.

### Chip row UI (starter, selection-in-progress only)

Above the chip row (between parent heading and chips), render:

- Instruction line: `"You're on Revenue Health Snapshot™ — select 3 subsystems to evaluate in this system. Choose the ones most relevant to your business right now."` (Inter 12px, `#888880`)
- Once 3 selected for the parent: replace with `"3 subsystems selected. Start answering below ↓"`
- Inline counter on the right of the chip row: `"{n} of 3 selected"` in system color, Inter 11px bold

Below the chip row, when `0 < selectedForParent.length < 3` AND not all 3 chips have any responses, show muted link "Change selection" (Inter 11px `#888880`, button styled as link). For Snapshot the row is already in selection mode whenever fewer than 3 are picked, so this link primarily reads as affordance — clicking is a no-op visual; it surfaces that chips are mutable. (Spec wording is preserved.)

Chip rendering tweaks (starter only):

- Unselected chip in selection mode: neutral outline (use existing not-active styling)
- Selected chip: highlight in system color (existing `active` styling)
- Locked-by-cap chip (cap reached, not selected): 🔒, greyed, `cursor: not-allowed`
- In-progress selected chip: small "In progress" pill (Inter 10px, `#888880`) inline with chip label

### Default active child

Update `initialChild` / `selectParent`:

- starter + parent has selections → first selected child for that parent
- starter + no selections yet for parent → `activeChildId = null`, right pane shows only the heading + instructions + chips (no question cards, no locked card)
- pro/diagnostic → unchanged

### Right-pane gating

When `tier === 'starter'` and `activeChildId` is null (selection in progress, none chosen yet), do NOT render question cards or the locked upsell card — just the parent header + instruction + chips.

### Left nav (sidebar within page)

The vertical nav already lists child systems. Apply the same `locked` predicate:

- starter, selection complete (3 selected for parent): non-selected children show 🔒 (already 🔒 rendering exists for `access_tier === 'paid'`; reuse)
- starter, mid-selection: non-selected children render as inactive/greyed but not locked (since user can still pick); selected ones render normally
- pro/diagnostic: unchanged

## Files Touched

- `src/lib/healthcheck.functions.ts` — extend `HealthCheckData`, add `updateSelectedChildIds` server fn
- `src/routes/health-check.index.tsx` — tier bar, selection state, chip mode rendering, locked predicate update, left nav update

## Out of Scope

- Question card UI, auto-save, auto-advance
- Migrations (column exists)
- Any other route or page
- `app-sidebar.tsx` (left app sidebar) — selection only affects the in-page left nav
