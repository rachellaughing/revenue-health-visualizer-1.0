## Problem

The screenshot shows the desktop left rail AND the right panel side-by-side on a 390px viewport — the mobile horizontal tabs are not visible. The previous edit gated layout on `useIsMobile()`, which:

1. Returns `false` during SSR and on first paint (it's a `useEffect`-driven hook).
2. In the SSR'd Health Check shell, that first-paint desktop layout sticks because the iframe preview isn't always triggering a re-render at mobile width, leaving the user looking at the desktop layout.

The fix: drive the layout switch with **CSS media queries** instead of a JS hook. CSS is correct on first paint, has no hydration gap, and works regardless of SSR.

## Changes (single file: `src/routes/health-check.index.tsx`)

### 1. Remove `isMobile` gating, render both layouts unconditionally

- Always render the desktop left rail `<div>` (drop the `!isMobile && …` wrapper at line 1342).
- Always render the mobile horizontal tabs block (drop the `isMobile && …` wrapper at line 1525).
- Replace `padding: isMobile ? 16 : "24px 32px"` with a static value of `"24px 32px"`, then override via CSS class on mobile.
- Drop `flexDirection: isMobile ? "column" : "row"` and `alignItems: isMobile ? "stretch" : "center"` on the completion banner — drive those with CSS too.

### 2. Add `className` markers to the elements that swap

- Desktop left rail `<div>`: `className="hc-desktop-rail"`
- Mobile tab row `<div>`: `className="hc-mobile-tabs"`
- Right panel `<div>`: `className="hc-right-panel"`
- Completion banner outer `<div>`: `className="hc-completion-banner"`
- Completion banner CTA `<a>`: `className="hc-completion-cta"`

(Inline styles remain for everything else; classes only carry the responsive overrides.)

### 3. Add a small CSS block to `src/styles.css`

```css
/* Health Check — responsive nav swap */
.hc-mobile-tabs { display: none; }

@media (max-width: 767px) {
  .hc-desktop-rail { display: none !important; }
  .hc-mobile-tabs  { display: flex !important; }
  .hc-right-panel  { padding: 16px !important; }
  .hc-completion-banner {
    flex-direction: column !important;
    align-items: stretch !important;
  }
  .hc-completion-cta { text-align: center !important; }
}
```

### 4. Drop the now-unused `useIsMobile` import/usage in this file

Remove `const isMobile = useIsMobile();` and the `useIsMobile` import if no longer used elsewhere in the file.

## Out of scope

- No changes to the desktop layout at ≥768px.
- No changes to question cards, top bar, tier bar, completed landing, team inline component.
- No changes to other routes or shared components — only this file and a small block in `styles.css`.
