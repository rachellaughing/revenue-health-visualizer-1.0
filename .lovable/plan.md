# Auto-Collapse Health Check Question Cards

Update `src/routes/health-check.index.tsx` only. No changes to save logic, schema, or auto-advance.

## Behavior

- A card becomes **collapsed** when it is "complete" (health > 0 AND tracking != null) OR skipped (health === -1).
- Collapse happens **600ms after the tracking response is selected** (for answered cards) or 600ms after skip is pressed.
- Auto-scroll to the next unanswered card fires **after** collapse (move the existing `setTimeout(..., 400)` in `setTracking` to ~700ms so it runs just after collapse).
- Clicking anywhere on a collapsed card re-expands it (overrides the auto-collapse for that card until the user navigates away or the card is re-completed).
- Unanswered / in-progress cards stay fully expanded — no change.

## State

Add per-card UI state inside the component:

```ts
const [manuallyExpanded, setManuallyExpanded] = useState<Record<string, boolean>>({});
const [autoCollapsed, setAutoCollapsed] = useState<Record<string, boolean>>({});
```

- On `setTracking`: schedule `setTimeout(() => setAutoCollapsed(s => ({...s, [qid]: true})), 600)` and clear any `manuallyExpanded[qid]`.
- On `setHealth(area, -1)` (skip): same 600ms collapse.
- On `setHealth(area, val)` with val > 0 when previously complete: clear `autoCollapsed[qid]` so the user can pick a new tracking value (card re-expands).
- Clicking a collapsed card sets `manuallyExpanded[qid] = true`.

A card renders collapsed when `(isComplete || isSkipped) && autoCollapsed[qid] && !manuallyExpanded[qid]`.

## Compact card markup

Replace the full card body (lines ~952–1124) with a conditional: if collapsed, render the compact row; otherwise render the existing expanded body unchanged.

Compact row layout:

```text
[✓] CATEGORY · Health label · Tracking label                Edit →
```

Styling (inline, matching existing token usage `T.paper`/`T.white`, `T.tealBright`, `T.mid`, `T.teal`):

- container: `height: 44px`, `padding: 10px 16px`, `display: flex`, `align-items: center`, `gap: 12`, `background: #FFFEFA`, `border: 1px solid ${systemColor}4D` (30% opacity), `borderRadius: 12`, `marginBottom: 14`, `cursor: pointer`, `group` hover to reveal Edit
- ✓ icon: `#4ABFC4`, 14px, bold, fixed width
- area name: Inter 11px, `color: systemColor`, `text-transform: uppercase`, `font-weight: 700`, `letter-spacing: 0.5`
- separator `·`: `color: #888880`, margin 0 8px
- health label: Inter 12px, `#888880` — pulled from `HEALTH_LABELS[r.health - 1]`
- tracking label: Inter 12px, `#888880` — pulled from `TRACKING_LABELS[r.tracking - 1]`
- "Edit →": Inter 11px, `#2A6B6E`, margin-left: auto, `opacity: 0` default, `opacity: 1` on container hover (use a small CSS class added to `src/styles.css` or a hover state via `onMouseEnter/Leave`)

Skipped variant:

```text
○ CATEGORY · Skipped · Answer this →
```

- `○` in `#888880`
- "Skipped" label italic, `#888880`
- "Answer this →" replaces "Edit →", same styling

## Hover for "Edit"

Inline style cannot do `:hover`. Add a tiny scoped class in `src/styles.css`:

```css
.hc-card-compact .hc-card-edit { opacity: 0; transition: opacity 120ms; }
.hc-card-compact:hover .hc-card-edit { opacity: 1; }
```

Use `className="hc-card-compact"` on the compact container and `className="hc-card-edit"` on the Edit link.

## Auto-scroll timing

In `setTracking` (line 341), change `setTimeout(() => advanceToNext(area), 400)` → `700` so the collapse animation/state flip happens before the scroll. In skip path (`setHealth` line 330), keep 300ms or bump to 700ms for consistency (use 700ms).

## Out of scope

- No change to `saveResponse`, persistence debounce, completion calculation, skip-warning banner, or selection chips.
- No change to expanded card markup beyond wrapping it in the `if (!collapsed)` branch.
