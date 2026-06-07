## Scope

Build `/report/executive-summary` matching the attached prototype. Includes AI narrative generation cached in `public.report_narratives`. No changes to Health Check flow.

## Routing

Spec says `/report/executive-summary` but current project file is `src/routes/reports.executive-summary.tsx` (→ `/reports/executive-summary`). Plan: **rename to `src/routes/report.executive-summary.tsx`** (→ `/report/executive-summary`) per the prompt. Old file deleted.

Public-style route would 401 during SSR because data fetching needs the authed user — place under `src/routes/_authenticated/report.executive-summary.tsx` instead, matching the existing `_authenticated` gate pattern. (The other `reports.*` files currently live outside `_authenticated`; out of scope to migrate them this turn.)

## Schema check

`public.report_narratives` columns: `id, assessment_id, user_id, exec_headline, exec_body, narrative_pos, narrative_auth, narrative_conv, narrative_lfc, narrative_vis, model_used, generated_at, created_at`.

**Missing**: a column for the 3 AI-generated risks. Add `top_risks jsonb` (array of `{rank, system, text}`).

Migration:

```sql
ALTER TABLE public.report_narratives
  ADD COLUMN IF NOT EXISTS top_risks jsonb;
```

## Server functions (`src/lib/report.functions.ts`, new file)

### `getExecutiveSummary({ assessmentId? })`
`requireSupabaseAuth` + Zod. All reads via `supabaseAdmin`, scoped to `context.userId`.

- Resolve `assessmentId`: if not provided, pick latest `assessments` row for `user_id` with `status='completed'` ordered by `submitted_at desc`. If none, throw `NoCompletedAssessment` (route shows empty state CTA → `/health-check`).
- Ownership check on the assessment.
- Parallel fetch:
  - `assessments` row (overall_health_score, submitted_at, assessment_version, tier_at_start, selected_child_ids).
  - `assessment_scores` joined in memory to `revhealth2.child_systems` and `revhealth2.parent_systems` (PostgREST can't cross-schema-join).
  - `profiles` (first_name, tier, business_name).
  - `company_profiles` (annual_revenue, funding_stage, pain_points).
  - `report_narratives` for this assessment.
- Aggregate `assessment_scores` per parent system: avg health, avg tracking, severity (use existing thresholds: <40 critical, <60 fragile, <75 stable, else strong), shadow flags, count assessed children. Return per-parent rows with `code`, `name`, `color_hex`.
- If no narrative row exists → invoke `_generateReportNarrativeImpl(assessmentId, userId)` inline and return its result (so first load returns content). On failure, return narrative=null and let UI show error + retry button.
- Return DTO: `{ tier, profile, company, assessment, systems: ParentScore[], overallScore, narrative: { headline, body, risks } | null, quarter: 'Q# YYYY' }`.

### `_generateReportNarrativeImpl(assessmentId, userId)` (helper) + `generateReportNarrative` (serverFn wrapper)
- Re-loads minimal data needed for prompt (systems + company profile).
- Builds prompt per the spec exactly, **extended** with a `risks` field requirement:
  > Respond in this exact JSON format:  
  > `{"headline":"...","body":"...","risks":[{"rank":1,"system":"...","text":"..."},{"rank":2,...},{"rank":3,...}]}`
  > Choose risks as the 3 lowest-scoring systems by health_score.
- POST to `https://api.anthropic.com/v1/messages` with `process.env.ANTHROPIC_API_KEY`, model `claude-sonnet-4-20250514`, `max_tokens: 800` (bumped from 400 to fit risks). Use native `fetch`.
- Extract `content[0].text`, strip code fences if present, `JSON.parse`. Validate via Zod (headline string, body string, risks length 3).
- Upsert `report_narratives` on `assessment_id` with `exec_headline`, `exec_body`, `top_risks`, `model_used='claude-sonnet-4-20250514'`, `generated_at=now()`, `user_id`.
- Returns `{ headline, body, risks }`.

### Caching
Never regenerate if a `report_narratives` row exists; UI also exposes a future "regenerate" only if explicitly requested (not in this scope).

## Route page (`src/routes/_authenticated/report.executive-summary.tsx`)

Translate prototype JSX to TSX. Keep prototype's inline styles + colours **verbatim** — they match the brand tokens already defined; do not rewrite to Tailwind. Constants `T = {...}` copied from prototype, with one fix: `T.sys.CONV` etc. — keep prototype values since they match design intent.

Data flow:
- `useQuery` calling `getExecutiveSummary` via `useServerFn`.
- Skeleton state while loading (skeleton lines in narrative card; layout shell stays rendered).
- If `narrative` is `null` after fetch, show skeleton + retry button that triggers `generateReportNarrative` and refetches.

Sections built 1:1 from prototype:
1. Top bar (no tier toggle — derived from real `tier`).
2. Breadcrumb with real `quarter`.
3. `<BlindspotCallout />` linking to https://marketplacemaven.com/founder-blindspots.
4. Hero: narrative card (headline/body/company line + starter notice) + score ring card.
5. Operating Conditions (4 cards) — computed from scores:
   - **Revenue Leakage**: from Lifecycle health (≥70 Low/success, ≥50 Moderate/warning, else High/danger).
   - **Operational Stability**: from avg tracking (≥60 Stable/success, ≥40 Fragile/warning, else Critical/danger).
   - **Visibility Confidence**: `${round(visTracking)}%` (≥60 success, ≥40 warning, else danger).
   - **Scale Readiness**: from `overallScore` − avg visibility gap (≥65 Ready/success, ≥45 At Risk/warning, else Not Ready/danger).
   - Each card's description is short, derived from the data (deterministic copy, not AI).
6. System Health table — 5 rows. For `starter` tier, rows 4 + 5 (sorted by `parent_systems.sort_order`, picking parents the user did NOT pick child systems in) render with **blurred realistic data** generated via existing `getIllustrativeScores(assessmentId)` seed; row overlay = "Sample data" + Unlock button.
7. Top Risks — 3 cards from `narrative.risks` (AI). If null, 3 skeleton cards.
8. Matrix Map teaser card → link `/revenue-intelligence/matrix-map` (route may not exist yet; render as link, no preflight).
9. Tier-conditional CTA card:
   - `starter` → upgrade card.
   - `pro` → "Recommended Next Step" Diagnostic card.
   - `diagnostic` → roadmap CTA card (`/revenue-intelligence/roadmap-builder`).
10. Method note + `© 2025 Marketplace Maven. All rights reserved.`

Layout uses the prototype's main column `maxWidth: 920` — no app sidebar inside the report content for now (matches prototype). Route is still under `_authenticated`, so the user must be signed in.

## Files Touched

- migration: `report_narratives.top_risks jsonb`
- `src/lib/report.functions.ts` — new (`getExecutiveSummary`, `generateReportNarrative`, helper)
- `src/routes/_authenticated/report.executive-summary.tsx` — new (page)
- `src/routes/reports.executive-summary.tsx` — delete (old placeholder)

## Out of Scope

- Other report pages (founder-dependency, revenue-at-risk, etc.)
- Migrating existing `reports.*` routes to `_authenticated/report.*`
- PDF export
- Regenerate-narrative UI
- Building `/revenue-intelligence/matrix-map` (link target)
- Any change to Health Check, scoring engine, or auth flow

## Test

1. Run migration.
2. Sign in as user with a completed Health Check; visit `/report/executive-summary`.
3. Confirm narrative skeleton → real content; verify a row appears in `public.report_narratives` with `exec_headline`, `exec_body`, `top_risks` populated.
4. Reload — narrative loads instantly from cache, no second Anthropic call (verify via logs).
5. Toggle profile.tier to `starter` in DB → confirm last 2 system rows render blurred with Unlock CTA; upgrade card shows.
