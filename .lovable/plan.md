## Finding

All five classes you asked for are already attached in `src/routes/health-check.index.tsx`:

| Class | Line | Element |
|---|---|---|
| `hc-desktop-rail` | 1343 | Left sidebar `<div>` containing the 5 system nav items |
| `hc-right-panel` | 1524 | Main right content `<div>` |
| `hc-mobile-tabs` | 1526 | Horizontal scrollable row of 5 parent-system tab buttons (name + %) with `selectParent(p.id)` on click |
| `hc-completion-banner` | 1598 | Dark "Health Check is complete" card |
| `hc-completion-cta` | 1617 | "View your Report →" anchor inside the banner |

No new elements need to be created. The mobile tab row already exists with the exact behavior you described (dot + name + percentage, click switches active system).

## The one real bug

The `hc-mobile-tabs` div has an inline `display: "flex"` (line 1528). Inline styles beat the stylesheet's default `.hc-mobile-tabs { display: none }`, so on desktop (≥768px) the mobile tab row renders *in addition to* the desktop rail. On mobile the CSS `!important` rule wins, so mobile is fine — but desktop ends up with both navs stacked.

## Change (one file, one edit)

`src/routes/health-check.index.tsx` lines 1525–1534 — remove the inline `display: "flex"` line from the `hc-mobile-tabs` style object so the CSS controls visibility:

```diff
   <div
     className="hc-mobile-tabs"
     style={{
-      display: "flex",
       overflowX: "auto",
       WebkitOverflowScrolling: "touch",
       borderBottom: `1px solid ${T.offWhite}`,
       margin: "-16px -16px 16px",
     }}
   >
```

That's the only JSX change. The CSS in `src/styles.css` is untouched.

## If mobile still looks broken after this

Then the issue isn't the JSX — it's that the latest `src/styles.css` isn't being served (stale dev-server cache, or you're viewing a previously published URL instead of the preview). Hard-reload the preview and confirm. I won't change CSS per your instruction.

## Out of scope

Desktop layout at ≥768px, question cards, top bar, tier bar, completed landing, team component, other routes.
