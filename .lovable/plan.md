## Health Check — mobile layout fix

Scope: `src/routes/health-check.index.tsx` only. Desktop (≥768px) layout unchanged.

### 1. Hide left rail on mobile, show horizontal parent tabs

In `HealthCheckShell`:

- Read `useIsMobile()` from `@/hooks/use-mobile`.
- When `isMobile`, do NOT render the existing `<div>` left rail (lines ~1337–1514). Instead, render a new horizontal tab row at the top of the right panel (before the completion banner).
- Tab row container: `display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 0; border-bottom: 1px solid var(--mm-off-white); margin: -16px -16px 16px;` (bleed to panel edges, scroll horizontally, no wrap).
- One tab per parent (5 total):
  - `flex-shrink: 0; white-space: nowrap; padding: 10px 16px; cursor: pointer; background: none; border: none; border-bottom: 2px solid <color | transparent>;`
  - Contents: colored dot (8px circle, `background: #<parent.color_hex>`) + parent name (12px, `fontWeight: isActive ? 600 : 500`, color: active → `T.ink`, inactive → `T.mid`) + percentage (11px, `T.mid`, shown only when `pct > 0`).
  - Active tab: `border-bottom: 2px solid #<parent.color_hex>` and darker text; inactive: transparent border.
  - `onClick` → `selectParent(p.id)` (existing function).

- Below the tab row, the existing parent-name heading + child chips + question cards render full width.

### 2. Mobile right-panel padding and body layout

- The body wrapper (line 1334 `<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>`) stays flex; on mobile the left rail is simply not rendered so the right panel takes full width naturally.
- Right panel padding: `padding: isMobile ? "16px" : "24px 32px"` (line 1517).

### 3. Completion banner stacks on mobile

Existing banner (lines 1518–1550) uses `display: flex; justifyContent: space-between`. Change to:
- `flexDirection: isMobile ? "column" : "row"`
- `alignItems: isMobile ? "stretch" : "center"`
- CTA `<a>` gets `textAlign: "center"` on mobile so it spans full width of the column.

### 4. Out of scope / unchanged

- Desktop sidebar, collapse button, child sub-list under active parent: untouched.
- Top bar, tier indicator bar: untouched (already fit mobile width; the top bar is 52px with horizontal padding 24px — leave as-is per "no other changes").
- Question cards (`AnswerCard`, collapsed cards, edit forms): untouched. They already use percentage widths and will fill the now-wider right panel.
- `CompletedLanding` (the post-completion screen) and `TeamMemberCompletionInline`: untouched.

### Technical notes

- `useIsMobile()` returns `false` during SSR, so on first paint mobile users briefly see the desktop layout for one frame before hydration — acceptable, consistent with the rest of the app.
- No new CSS files; all styling stays inline to match the file's existing convention.
- No new dependencies. No route, server function, or data-shape changes.
