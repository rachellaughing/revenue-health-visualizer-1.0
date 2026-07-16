## Problem

In `getMatrixMap` (`src/lib/report.functions.ts`, ~lines 1447–1493), the "Key Cause & Effect Chains" cards derive their `nodes` by taking the 3 weakest child systems and calling `walkChain()` — a traversal of `failure_map.impacted_system_*`. Only the card `label` and `note` come from `revhealth2.critical_paths`; the child-system list has no connection to the path at all. That's why Demand Engine renders Visibility children and Customer/Market Authority both render the same Authority children.

## Fix

Load the actual path membership from `revhealth2.critical_path_members` and render those exact child systems, in order, per path.

### `src/lib/report.functions.ts` — `getMatrixMap` only

1. Extend the `pathsRes` query (~line 1247) to select `id` in addition to `name,tagline,definition,bottleneck_logic,sort_order`.
2. Add a parallel fetch for `revhealth2.critical_path_members`, selecting `critical_path_id, child_system_id, sort_order`. No filter — 3 paths × 6 members is tiny.
3. Build `membersByPath: Map<pathId, childSystemId[]>` ordered by `sort_order`.
4. Replace the current `criticalChains` construction (the `seedsForChains` + `walkChain` block, ~1447–1493) with:
   - For each path row in `paths` (already ordered by `sort_order`, limit 3):
     - Resolve member child IDs → `childInfoById` entries in member order.
     - `nodes` = member `name`s in that order.
     - `parentCode` = parent code of the first member (falls back to `"POS"` if missing) — matches how the card colors itself via `T.sys[chain.parentCode]`.
     - `label` = `path.name`.
     - `note` = `path.bottleneck_logic ?? ""`.
   - Drop any member whose id isn't in `childInfoById` (defensive; shouldn't happen).
5. Remove the now-unused `seedsForChains` and `walkChain` helper (scoped to this block; nothing else calls them — confirm with a quick grep before deleting; if referenced elsewhere, leave them and only stop calling them here).

Nothing else on the Matrix Map page or in the response shape changes. `MatrixChain` type is unchanged.

## Out of scope

- The failure-map-driven `connections` / `systemConnections` sections (unrelated).
- Ordering, styling, or copy of the chain cards.
- Any other report or page.
