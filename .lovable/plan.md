## Plan: Top Opportunities Report

### 1. Server function — `getTopOpportunities` in `src/lib/report.functions.ts`

Auth-protected serverFn returning data for the current user's latest completed assessment. Uses `supabaseAdmin` per project rule.

**Queries (parallel):**
- `profiles` → tier, first_name
- latest `assessments` (completed) → id, selected_child_ids, submitted_at
- `assessment_scores` for that assessment → health_score, tracking_score, severity, child_system_id
- `revhealth2.child_systems` (all 50) → id, code, name, parent_system_id, access_tier, sort_order
- `revhealth2.parent_systems` → id, code, name, color_hex
- `revhealth2.failure_map` (all 50) → child_system_id, core_symptoms, likely_root_causes, impacted_system_1/2/3, impact_reason_1/2/3

**Per-child computation:**
- Build `childByName` map (name → {id, healthScore, parentCode}).
- For each child system: derive `healthScore`/`trackingScore`/`severity`:
  - assessed → from `assessment_scores`
  - not assessed → deterministic illustrative score via hash(assessmentId + code) returning 40–85 (same helper pattern as Revenue System Health page).
- Effort: `<40 High`, `40–59 Medium`, `≥60 Low`.
- Timeframe: High→`90–180 days`, Medium→`60–120 days`, Low→`14–60 days`.
- Cascade impacts: for each of impacted_system_{1,2,3}, look up the named child system's healthScore from the map. Emit `{ system, reason, score (number|null) }`. Score < 60 marks as "weak".
- `weakCascadeCount` = number of cascade impacts whose score is non-null AND < 60.
- `opportunityScore = round((100 - healthScore) * (1 + 0.15 * weakCascadeCount))`.

Return shape:
```ts
{
  tier, profile: { first_name },
  assessment: { id, submitted_at },
  selectedChildIds: string[],
  opportunities: Array<{
    childSystemId, code, name, parentCode, parentName, parentColorHex,
    healthScore, trackingScore, severity,
    opportunityScore, coreSymptom, likelyRootCause,
    cascadeImpacts: [{ system, reason, score|null }],
    effortLevel, timeframe,
    assessed: boolean,
  }>
}
```

Sort opportunities desc by `opportunityScore`. (Starter assessed-first sort applied client-side so locked items still render.)

### 2. Route — `src/routes/reports.top-opportunities.tsx` (replace stub)

- `createFileRoute("/reports/top-opportunities")` with `head()` meta.
- `useServerFn(getTopOpportunities)` + `useQuery`. While loading: render empty paper background (no skeleton — matches Executive Summary pattern). On data: render page.
- Port prototype verbatim using inline styles + the `T` token object already used in sibling report page. Sections:
  1. Breadcrumb `REVENUE HEALTH MATRIX™ › TOP OPPORTUNITIES`
  2. H1 "Top Opportunities" + subline
  3. "How opportunity score is calculated" card (📐)
  4. Self-assessment reminder card (🔍) with link to `https://marketplacemaven.com/founder-blindspots`
  5. Filter bar pills (All / POS / AUTH / CONV / LFC / VIS) — local `useState` for `filterSystem`
  6. Ranked `OpportunityCard` list with collapse/expand (`expandedId` state; first card open by default)
  7. Starter upgrade gradient overlay
  8. Copyright footer
- Tier gating:
  - **starter** → `isLocked = !assessed`. Sort assessed first (preserving opp score order within each group). Locked rows blurred (`filter: blur(3px); opacity: 0.7`) with illustrative data already supplied by server. Bottom gradient overlay with ember CTA: "Showing opportunities for {N} of 10 subsystems per system" / "Upgrade to see all opportunities →".
  - **pro / diagnostic** → all rows visible, pure opportunity-score order.
- Rank number = filtered index + 1.
- `OpportunityCard`: matches prototype exactly — header grid (rank pill / name+parent+dot / health / severity badge / opp score / chevron), expanded body (3 cols: What's Happening / Likely Root Cause / Effort & Timeframe), cascade impacts in offWhite block with numbered circles + red "Also weak (score)" badge when impact.score < 60, "View in Revenue System Health →" outlined button (anchor to `/reports/revenue-system-health`).
- No narrative generation, no AI calls.

### 3. Technical notes

- `impacted_system_N` is free text — match against `child_systems.name` (case-insensitive trim). If no match found → `score: null` and no "Also weak" badge shown.
- Illustrative scores must be deterministic per (assessmentId, childCode) so blurred values stay stable across renders.
- All DB ops via `supabaseAdmin` (per project rule). Use `(supabaseAdmin as any).schema("revhealth2")` for framework tables (pattern matches `healthcheck.functions.ts`).
- No DB migrations needed.
- No changes to existing files other than adding `getTopOpportunities` export to `report.functions.ts` and replacing the stub route file.
