## Switch Health Check responsive nav back to JS-controlled rendering

CSS class approach is unreliable — switch to `useIsMobile()` (existing hook at `src/hooks/use-mobile.tsx`, breakpoint 768).

### Edits in `src/routes/health-check.index.tsx`

1. **Add import** alongside existing imports:
   ```ts
   import { useIsMobile } from "@/hooks/use-mobile";
   ```

2. **Inside `HealthCheckPage`**, near the other hooks, add:
   ```ts
   const isMobile = useIsMobile();
   ```

3. **Desktop rail (line 1342)** — wrap with `{!isMobile && (...)}` and remove `className="hc-desktop-rail"`.

4. **Right panel (line 1524)** — remove `className="hc-right-panel"`; change inline padding to `isMobile ? 16 : "24px 32px"`.

5. **Mobile tabs block (lines 1525–1594)** — wrap with `{isMobile && (...)}`; remove `className="hc-mobile-tabs"`; add inline `display: "flex"` back to the style object so it renders as a flex row.

6. **Completion banner (line 1596)** — remove `className="hc-completion-banner"`; switch inline `flexDirection` to `isMobile ? "column" : "row"` and `alignItems` to `isMobile ? "stretch" : "center"`.

7. **Completion CTA (line 1614)** — remove `className="hc-completion-cta"` (the existing inline `textAlign: "center"` already covers mobile).

### Out of scope

- CSS file untouched (the now-unused `.hc-*` rules in `src/styles.css` stay — user said don't touch CSS).
- No changes to desktop layout, question cards, top bar, tier bar, other routes.
