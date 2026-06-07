## Team Alignment Report — /reports/team-alignment

### 1. Server function — `getTeamAlignment` in `src/lib/report.functions.ts`

Auth-protected serverFn using `supabaseAdmin` (per project rule).

Parallel queries:
- `profiles` → tier, first_name, user_id
- `company_profiles` → company_name
- latest completed `assessments` for the user → submitted_at, assessment_type
- `alignment_scores` for the user (joined to `revhealth2.parent_systems` via parent_system_id) → founder_score, team_avg_score, gap, gap_direction, alignment_status, cluster_scores (jsonb)
- `revhealth2.parent_systems` → code, name, sort_order (for ordering + color mapping)
- `consultant_observations` (tier === 'diagnostic' only) → generated_narrative keyed by parent_system_id
- `diagnostic_recommendations` (tier === 'diagnostic' only) → top 3 by rank, join child_systems to get parent + color
- `team_members` count of invited members + completion status (for "waiting for team" detection)

Tier-state logic:
- `starter`: synthesize illustrative ALIGNMENT_DATA per parent (deterministic hash on user_id+code; same helper pattern as other reports), `state = 'preview'`
- `pro`/`diagnostic` with zero `alignment_scores` rows AND at least one invited team member who hasn't submitted: `state = 'waiting'`
- otherwise `state = 'ready'`

Summary metrics (computed server-side):
- `overallAlignment` = round(avg of `(100 - abs(gap))` across systems)
- `criticalGaps` = count where alignment_status = 'critical_gap'
- `leaderHigher` = count where gap_direction = 'founder_high' AND status != 'strong_alignment'
- `teamHigher` = count where gap_direction = 'team_high' AND status != 'strong_alignment'

Return shape:
```ts
{
  tier, state, profile, company, assessment,
  systems: [{ code, name, color, founderScore, teamAvg, gap, direction, status, clusters: [{label, score}], narrative?: string }],
  summary: { overallAlignment, criticalGaps, leaderHigher, teamHigher },
  recommendations: [{ rank, title, rationale, effortLevel, timeframe, systemColor, systemName }],
  teamInviteLink?: string,        // for waiting state
  invitedCount?, completedCount?  // for waiting state
}
```

### 2. Route — replace `src/routes/reports.team-alignment.tsx`

`createFileRoute("/reports/team-alignment")` + `head()` meta. `useServerFn(getTeamAlignment)` + `useQuery`. Inline styles + `T` token object matching the prototype exactly.

Layout (matching prototype):
1. **Breadcrumb** `REPORTS › TEAM ALIGNMENT`
2. **H1** + subline with company name + submitted_at
3. **Waiting state** (early return): centered card with invite link + copy button — no other sections render
4. **Tier banner** (starter or pro only): dark `#182829` panel with tier-specific copy + ember CTA
5. **Anonymity callout**: amber card with the verbatim brief copy
6. **Summary cards row**: 4 cards (Overall Alignment %, Critical Gaps, Leader Sees Stronger, Team Sees Stronger)
7. **Score comparison chart card**: top-right toggle (Radar | Side by side) — `useState` `chartView`
   - **Radar**: SVG pentagon (viewBox 0 0 400 400), 4 concentric grid pentagons (25/50/75/100), 5 axes, founder polygon as dashed ember stroke (no fill), team polygon as teal fill at 0.25 opacity with solid stroke, axis labels in system colors
   - **Side by side**: row per system — system label, two horizontal bars (ember = founder, teal = team), gap badge on right
8. **System-by-system breakdown**: one collapsible card per parent system (local `expandedSystem` state)
   - Collapsed: colored dot, name, status badge (gap-color background), gap label, chevron
   - Expanded: 3 score tiles (Your / Team Avg / Gap), cluster bar chart (one bar per cluster_scores entry), gap interpretation paragraph using direction-specific copy from brief
   - Diagnostic only: consultant observation card with teal left border showing `narrative`
9. **Consultant Recommendations** (diagnostic only): 3 ranked cards with system-colored left border, rank number, title, rationale, effort badge, timeframe
10. **Non-diagnostic upsell** (pro only): dark panel + "Learn about the Diagnostic™" CTA
11. **Copyright footer** `© 2025 Marketplace Maven. All rights reserved.`

Starter tier wrapping: all sections from #5 onward wrapped in a div with `filter: blur(3px); userSelect: none; pointerEvents: none`.

Helpers:
- `gapColor(status)` returns `#EF4444 | #C4956A | #F59E0B | #10B981`
- `gapDirectionLabel(direction, abs(gap))` returns the brief's exact strings
- `gapInterpretation(direction, systemName, abs(gap))` returns the brief's exact paragraphs

### 3. Technical notes
- All DB ops via `supabaseAdmin`; `(supabaseAdmin as any).schema('revhealth2')` for framework tables
- No DB migrations; `public.alignment_scores`, `consultant_observations`, `diagnostic_recommendations` already exist
- `calculateAlignmentScores` server fn (writes to `alignment_scores` when all team members complete) is OUT OF SCOPE for this turn — brief says "trigger this when…" but report only reads existing rows. Will flag if you want it built now.
- No new packages. No changes outside:
  - add `getTeamAlignment` export in `src/lib/report.functions.ts`
  - replace `src/routes/reports.team-alignment.tsx` stub
