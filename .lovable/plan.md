# Revenue System Health Report

## Scope
Replace the stub at `src/routes/reports.revenue-system-health.tsx` with the full report matching `rhv-report-system-health-v2.jsx`, wired to live data via a new server function. Extend `generateReportNarrative` to also produce per-system paragraphs.

No DB migration needed — `report_narratives.narrative_pos/auth/conv/lfc/vis` columns already exist.

## 1. Server: extend narrative generation (`src/lib/report.functions.ts`)

- Extend `narrativeJsonSchema` with `systems: { POS, AUTH, CONV, LFC, VIS }` (each a string 1–2000 chars).
- Update `buildNarrativePrompt` to require a `"systems"` object in the JSON response with one paragraph per system, grounded in that system's child scores, weakest subsystem, shadow flags, and tracking gap.
- In `_generateReportNarrativeImpl`, upsert `narrative_pos`, `narrative_auth`, `narrative_conv`, `narrative_lfc`, `narrative_vis` alongside the existing fields.
- Extend the `Narrative` type with `systems: Record<"POS"|"AUTH"|"CONV"|"LFC"|"VIS", string>`.
- In `getExecutiveSummary`, also select `narrative_pos..narrative_vis` from `report_narratives`, and include them on the returned `narrative` object when present.

## 2. New server function: `getRevenueSystemHealth`

In `src/lib/report.functions.ts`, add `getRevenueSystemHealth` (mirrors `getExecutiveSummary` shape):
- Uses `requireSupabaseAuth` middleware, queries via `supabaseAdmin` (per project rule).
- Resolves latest completed assessment for the user (or accepts optional `assessmentId`).
- Loads `assessment_scores` joined logically with `revhealth2.child_systems` + `parent_systems` (already done in `loadCoreData`).
- Returns:
  - `tier`, `firstName`
  - `assessment.id`, `submitted_at`, `selected_child_ids`
  - `systems`: array of parent systems with `healthScore`, `trackingScore`, `visibilityGap`, `severity`, `assessed`, `children[]`
  - Each child: `code, name, healthScore, trackingScore, visibilityGap, isShadow (health>=60 && tracking<40), severity, assessed (bool)`
  - `narratives`: `{ POS, AUTH, CONV, LFC, VIS }` from `report_narratives`, possibly null
- Reuses `loadCoreData`/`aggregateByParent` and extends with child-level aggregation.

## 3. Route: `src/routes/reports.revenue-system-health.tsx`

Rebuild as a faithful port of the prototype, using the existing executive-summary tokens/helpers as style reference.

Structure (top-down):
1. `TopBar` breadcrumb: `Reports › Revenue System Health` (matches existing TopBar pattern; copy text REVENUE HEALTH MATRIX™ › REVENUE SYSTEM HEALTH per spec).
2. Page heading + subline.
3. "How to Read This Report" legend card with three columns: Health Score, Tracking Score, Visibility Gap (with green <15 / amber 15–25 / red >25 tiers, plus Shadow note).
4. `BlindspotCallout` (reuse from exec-summary; appears once at top).
5. Five `SystemSection` accordions in fixed order POS, AUTH, CONV, LFC, VIS — first open by default, others collapsed (local `useState`).
6. Footer: `© 2025 Marketplace Maven. All rights reserved.`

### `SystemSection` (per prototype)
Header: score ring (system color), system name + severity badge, tracking score, visibility gap, chevron. Click toggles open/closed.

Expanded body:
- "SYSTEM ANALYSIS" — paragraph from `narratives[code]`. If null, render a subtle grey placeholder block (no spinner, no button).
- Child table header: Subsystem / Score / Status / Health+Tracking bars / Gap / Confidence.
- Child rows via `ChildRow`:
  - Name + `HIGH GAP` badge (amber, all tiers) when `visibilityGap > 25`.
  - `SHADOW` badge (amber) only when Diagnostic AND shadow condition.
  - Health number, severity pill, dual-bar (thick health, thin tracking), gap number + contextual label:
    - `>25` → "Investigate" (non-Diagnostic) or "Shadow risk" (Diagnostic)
    - `15–25` → "Watch" (amber)
    - `<15` → none
  - Confidence label from tracking score (Very Low/Low/Moderate/High).
- For non-Diagnostic users with any child `gap > 25`, append an inline note: "Large visibility gaps may indicate hidden system risks. Shadow system analysis is available in the Revenue Health Diagnostic™."
- Bottom row: weakest subsystem callout + Link to `/reports/top-opportunities` ("View in Top Opportunities →").

### Tier gating for child rows
- `starter`: real rows for child systems in `selected_child_ids`; remaining children rendered with deterministic illustrative scores (reuse `hash` + per-child variant of `illustrativeForParent` keyed on `assessment.id` + child code), with blur filter and gradient fade overlay containing the "Unlock all 10 subsystems →" CTA (same look as prototype).
- `pro` / `diagnostic`: all rows real.

### Silent narrative generation
Client-side: `useQuery` for `getRevenueSystemHealth`. On mount, if any of `narratives.POS/AUTH/CONV/LFC/VIS` is null, fire `generateReportNarrative` once via `useRef`-guarded `useEffect`, then `refetch`. Never render a button, spinner, or skeleton — sections without narrative show a static grey placeholder block until refetch resolves.

## 4. Cross-impact
- `reports.executive-summary.tsx` consumes the same `Narrative` type; adding optional `systems` is backwards compatible (no UI change there).
- No changes to sidebar — `/reports/revenue-system-health` route already registered.

## Technical notes
- All DB reads use `supabaseAdmin` inside server functions, per project rule.
- Severity thresholds: <40 critical, <60 fragile, <75 stable, else strong.
- Visibility gap = health − tracking.
- Reuse design tokens/colors from the existing exec-summary file; do not introduce new font stacks.
- Use `Link` from `@tanstack/react-router` for the Top Opportunities link.
- No new dependencies.
