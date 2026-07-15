## Change

In `src/routes/health-check.index.tsx`, remove the completion/last-subsystem gate around `<CavitySearchCTA />` so it always renders directly beneath the current subsystem's area cards.

### Before (lines ~2440–2450)

```tsx
{(() => {
  const visible =
    tier === "starter"
      ? activeChildren.filter((c) => selectedSet.has(c.code))
      : activeChildren;
  const last = visible[visible.length - 1];
  return last && activeChild?.id === last.id && childComplete ? (
    <CavitySearchCTA />
  ) : null;
})()}
```

### After

```tsx
{activeChild && !isChildLocked(activeChild) && <CavitySearchCTA />}
```

## Behavior

- Renders on every subsystem, at the bottom of that subsystem's area cards, regardless of how many areas are answered.
- Still hidden when the current subsystem is locked (lock upsell owns that state) and during Starter selection mode (no active child yet).
- Sits above the existing skip-warning banner so page order remains: area cards → CTA → skip warning.

## Non-goals

No changes to CTA copy, styling, question logic, scoring, or the sticky breadcrumb.
