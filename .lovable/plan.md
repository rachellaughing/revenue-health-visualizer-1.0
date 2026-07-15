## Problem

In `src/routes/health-check.index.tsx`, `autoCollapsed` starts as an empty `{}` on every mount (line 1196). A card only collapses when its `question_id` is present in `autoCollapsed`, which currently only happens as a side effect of answering in the current session. On navigating away and back, previously-answered questions load from the DB into `responses`, but `autoCollapsed` is empty, so every completed question renders fully expanded.

## Fix

Initialize `autoCollapsed` from the already-loaded responses so any question that is complete or skipped starts collapsed.

Change line 1196 from:

```ts
const [autoCollapsed, setAutoCollapsed] = useState<Record<string, boolean>>({});
```

to seed from `initialResponses`:

```ts
const [autoCollapsed, setAutoCollapsed] = useState<Record<string, boolean>>(() => {
  const seed: Record<string, boolean> = {};
  for (const [qid, r] of Object.entries(initialResponses)) {
    const isSkipped = r.health === -1;
    const isComplete = r.health !== null && r.health > 0 && r.tracking !== null;
    if (isSkipped || isComplete) seed[qid] = true;
  }
  return seed;
});
```

`manuallyExpanded` stays empty on mount, so returning users see collapsed cards; clicking one still expands as before.

## Non-goals

No changes to answer/save logic, scoring, the sticky breadcrumb, the CTA, or styling.