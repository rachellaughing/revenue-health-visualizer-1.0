## Matrix Map — /revenue/matrix-map

Note: brief says `/revenue-intelligence/matrix-map`, but the sidebar already links `/revenue/matrix-map` (existing stub `src/routes/revenue.matrix-map.tsx`). I'll keep `/revenue/matrix-map` to avoid a broken nav link. Flag if you want me to rename the route + sidebar entry instead.

### 1. Server function — `getMatrixMap` in `src/lib/report.functions.ts`

Auth-protected serverFn, `supabaseAdmin` for all queries (per project rule).

Parallel queries:
- `profiles` → tier, first_name
- latest completed `assessments` → id, selected_child_ids, submitted_at
- `assessment_scores` for that assessment
- `revhealth2.parent_systems` (id, code, name, sort_order)
- `revhealth2.child_systems` (id, code, name, parent_system_id, access_tier, sort_order)
- `revhealth2.failure_map` (all rows)
- `revhealth2.critical_paths` (top 3 by sort_order)

Per-child derivation (same illustrative-score helper used by Top Opportunities / Revenue at Risk — deterministic hash(assessmentId+code) → 40–85 for unassessed; real `assessment_scores` for assessed). Severity bands: <40 critical, 40–59 strained, 60–74 needs attention, ≥75 healthy.

Per-parent aggregation:
- `healthScore` = avg of child healthScores in that parent (rounded)
- `trackingScore` = avg tracking
- `severity` = derived from parent healthScore
- `summaryCounts` = totals across all 50 children for the 4 summary cards

Parent-to-parent connections (CONNECTIONS):
- For each child failure_map row, match `impacted_system_{1,2,3}` text against `child_systems.name` (case-insensitive trim).
- Group source parent → target parent, count occurrences = `strength`. Drop self-loops. Keep top label = the first impact_reason found for that pair.

Per-parent upstream/downstream lists (for the zoom view):
- Downstream: for each child in the parent, walk its failure_map impacts, group by target parent. For each target parent emit `{ name, score: parentHealth, note: impact_reason_1, type }` where `type` is "strong" if reason exists and target parent health<60, else "moderate". Cap at 3.
- Upstream: invert — find children in OTHER parents whose impacts land in this parent. Group by source parent; same shape.
- If a parent has no upstream rows, emit the standard "No direct upstream dependencies" info row (only for POS).

Children-for-zoom payload per parent: all 10 child systems with `{ id, code, name, healthScore, severity, assessed, coreSymptom, likelyRootCause }`.

Critical-path chains:
- Use top 3 `critical_paths` by sort_order. Translate `bottleneck_logic`/`tagline` into the chain pills. If chain segment data isn't structured, fall back to surfacing `name` + `tagline` + `definition` per row and render as 3 pill chains using the parent codes referenced. (If critical_paths doesn't include explicit ordered system arrays, derive a 3-node chain per row from the 3 highest-strength CONNECTIONS that share a starting parent — keeps UI consistent without inventing copy.)

Scenarios payload (Scenario Simulator tab):
- One scenario per child system that has a failure_map row.
- `confidenceScore = round(min(95, (100 - healthScore) * (1 + 0.15 * weakCascadeCount)))` where weakCascadeCount = impacts whose mapped child healthScore < 60.
- Include `assessed`, `effortLevel`, `timeframe`, cascade impacts (with reason + score), `coreSymptom`, `likelyRootCause`.
- Sort desc by confidenceScore.

Return:
```ts
{
  tier, profile, assessment,
  selectedChildIds: string[],
  parents: ParentNode[],              // 5 nodes incl. x/y from fixed layout map
  summaryCounts: { critical, strained, needsAttention, healthy },
  connections: Connection[],
  systemConnections: Record<ParentCode, { upstream:[], downstream:[] }>,
  childrenByParent: Record<ParentCode, ChildNode[]>,
  criticalChains: Chain[],            // 3 chains
  scenarios: Scenario[],
}
```

Fixed pentagon positions hard-coded by parent code: POS(200,180), AUTH(200,360), CONV(420,270), LFC(640,180), VIS(640,360).

### 2. Route — replace `src/routes/revenue.matrix-map.tsx`

`createFileRoute("/revenue/matrix-map")` + `head()` meta. Uses `useServerFn(getMatrixMap)` + `useQuery`. Empty paper background while loading (matches other report pages). Inline-styles + `T` token object identical to attached prototype.

Layout:
- Tab strip at top: **Matrix Map** | **Scenario Simulator** (lock icon for starter). Local `useState` `activeTab`.
- Breadcrumb `REVENUE INTELLIGENCE › MATRIX MAP`.
- H1 + subline.

#### Tab 1 — Matrix Map
1. **Summary cards row** — 4 cards (Critical / Strained / Needs Attention / Healthy) with counts from `summaryCounts`.
2. **Map card** — two-column when `activeParent == null`:
   - Left rail: legend (severity colors, connection strength scale).
   - Center: SVG (viewBox 0 0 860 500) — draws curved connection paths (thickness `1 + strength/3`, color = source parent health color, dash when source health < 60, arrow marker), then 5 parent nodes (outer health ring, inner fill, score, name, severity). Click selects → glow + "CLICK TO ZOOM IN" hint. Second click (or click on glowing node) sets `zoomedParent`.
3. **Zoom view** (replaces map card body when `zoomedParent` set, no navigation):
   - Back button → clears zoom.
   - Three columns: Upstream Influences (left) | Children grid (center 5-col, all 10 nodes visible: assessed = full color score + "assessed" label, unassessed = greyed + 🔒 for starter / "EST" badge for pro+) | Downstream Effects (right, HIGH IMPACT badge when target parent health < 60).
   - Click a child node → child detail panel slides into the right column (replaces downstream temporarily) with name, severity badge, assessed/illustrative note, "View in Top Opportunities →" link to `/reports/top-opportunities`.
   - Starter only: ember CTA strip below grid "X subsystems locked — upgrade to assess all 10".
4. **Key Cause & Effect Chains card** — below map, always visible. Renders 3 chains as pill rows with `→` arrows + label + explanatory sentence.

#### Tab 2 — Scenario Simulator
- Starter: tab is disabled (lock icon, cursor-not-allowed). Clicking shows tooltip "Available in Revenue Health Assessment™ and above". Tab body never rendered for starter.
- Pro/Diagnostic:
  - Sorted scenario cards (collapsed: rank, system+parent dot, "Improve [name]", *ILLUSTRATIVE if unassessed, leverage badge (Critical ≥80 / High ≥60 / Moderate <60), confidence ring %, chevron).
  - Expanded: description (reframed core_symptoms), "What likely improves downstream" 3-col grid from cascade impacts, effort + timeframe + confidence + stabilisation note. Amber disclaimer card on illustrative scenarios.
  - Bottom disclaimer paragraph (verbatim from brief).

5. Copyright footer `© 2025 Marketplace Maven. All rights reserved.`

### 3. Technical notes
- All DB ops via `supabaseAdmin`; `(supabaseAdmin as any).schema('revhealth2')` for framework tables (existing project pattern).
- Inline styles + `T` token object to mirror the attached JSX prototype precisely — no Tailwind class refactor.
- No DB migrations. No new packages.
- No changes to other files beyond:
  - add `getMatrixMap` export in `src/lib/report.functions.ts`
  - replace `src/routes/revenue.matrix-map.tsx` stub
