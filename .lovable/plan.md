## Restructure Health Check body wrapper

In `src/routes/health-check.index.tsx`, replace the body wrapper (lines 1340–1599) so the mobile tabs render as a sibling above the sidebar+content row rather than nested inside the right panel.

### New structure

```
<div flex column>             ← outer (was flex row)
  <div mobile tabs>           ← moved out of right panel; display via isMobile
    {parents.map(...)}        ← existing tab buttons (unchanged content)
  </div>
  <div flex row>              ← content row
    {!isMobile && <sidebar>}  ← existing desktop rail (unchanged)
    <div right panel>         ← existing content (mobile tabs block removed)
  </div>
</div>
```

### Edits

1. **Line 1340** — change outer `<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>` to `<div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>`.

2. **After line 1340** — insert a new mobile-tabs `<div>` (sibling of the sidebar/right-panel row) using `display: isMobile ? "flex" : "none"`, `overflowX: "auto"`, `WebkitOverflowScrolling: "touch"`, `borderBottom: 1px solid ${T.offWhite}`, `flexShrink: 0`. Move the existing `parents.map(...)` tab buttons (currently lines 1538–1597) into this block verbatim — same button styles, same `selectParent` / `activeParent` / `parents` references.

3. **Wrap the sidebar + right panel** (current lines 1342–1599 minus the moved tabs) in a new inner row `<div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>`. Close it before the outer wrapper closes.

4. **Right panel (line 1527)** — remove the now-duplicated `{isMobile && (...)}` mobile-tabs block (lines 1528–1599). Leave the panel's `padding: isMobile ? 16 : "24px 32px"`, but since the negative-margin trick (`margin: "-16px -16px 16px"`) is no longer needed (tabs are outside the padded panel), drop it from the moved tabs block.

5. **Closing tags** — ensure the outer `</div>` (was at the body wrapper close) now wraps both the new tabs div and the new inner content row.

### Out of scope

- No changes to sidebar contents, tab button contents, right panel contents, completion banner, question cards, top bar, tier bar, CSS, or other routes.
- `isMobile`, `parents`, `selectParent`, `activeParent` already exist — no new state/hooks.
