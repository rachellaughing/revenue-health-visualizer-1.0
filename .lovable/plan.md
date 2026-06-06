
## Build the Dashboard

Yes — `.jsx` is fine as a reference. I'll port it to `.tsx`, replace the inline `T` color object with the project's CSS tokens from `src/styles.css` (`--mm-abyss`, `--mm-paper`, `--mm-ember`, system colors, etc.), and use Tailwind + existing shadcn primitives.

### 1. Server function: `getDashboardData`

New file `src/lib/dashboard.functions.ts`:

- `createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])`
- Uses **`supabaseAdmin`** scoped by `context.userId` (per project rule)
- Returns:
  - `profile`: `first_name, company_profile_complete, profile_complete, assessment_status, assessment_completion_pct, tier, business_name` from `public.profiles`
  - `latestAssessment`: most recent row from `public.assessments` (`order by created_at desc limit 1`) — id, status, submitted_at, created_at, assessment_version
  - `completedCount`: `count` of assessments with `status = 'completed'`
  - `scores`: row from `public.assessment_scores` for `latestAssessment.id` if it exists (overall + 5 system scores)

Single call, single round trip from the dashboard route.

### 2. Route `src/routes/dashboard.tsx`

Loader primes `ensureQueryData` with `getDashboardData`; component reads via `useSuspenseQuery`. Adds `errorComponent` + `notFoundComponent`. Determines state:

- **State 1 (New user)** = `!profile.profile_complete || !profile.company_profile_complete || !latestAssessment || latestAssessment.status !== 'completed'`
- **State 2 (Returning)** = both profiles complete AND ≥1 completed assessment

### 3. State 1 — New User View

Components (all in `src/components/dashboard/`):

- **`WelcomeHero.tsx`** — `bg-[var(--mm-abyss)]` banner, Instrument Serif "Welcome, {first_name}.", tier badge (pill showing "Revenue Health Snapshot™ / Assessment™ / Diagnostic™" mapped from `tier` value `starter|pro|diagnostic`), ember CTA "Complete Your Profile →" → `/profile/personal`.
- **`GettingStartedChecklist.tsx`** — progress bar (n/4) + 4 steps with done/locked/active states:
  1. Personal profile → done if `profile_complete`
  2. Company profile → done if `company_profile_complete`
  3. Start Health Check → done if `assessment_status !== 'not_started'`; locked until 1+2
  4. View Revenue Health Report → locked until `assessment_status === 'complete'`
- **`TierIncludedCard.tsx`** — right column, lists what's in the user's tier (content table mapped from `tier`).
- **`ConceptCards.tsx`** — 3 cards at bottom linking to `https://marketplacemaven.com` with `target="_blank" rel="noopener noreferrer"`.

### 4. State 2 — Returning User View

- **`WelcomeBackHeader.tsx`** — "Welcome back, {first_name}." + `business_name` + "Last Health Check: {Q# Year}" derived from `submitted_at`.
- **`ScoreSummaryPanel.tsx`** — `bg-[var(--mm-abyss)]` panel with overall score ring + 5 system bars (Positioning, Authority, Conversion, Lifecycle, Visibility, using `--mm-sys-*` tokens). Data source:
  - If `scores` row exists → use it.
  - Else → deterministic illustrative scores (seeded by `latestAssessment.id`) per Phase 3 brief §07. Helper `src/lib/illustrative-scores.ts`.
- **`InsightCards.tsx`** — 3 cards: weakest system (lowest score), top priority (placeholder mapped from weakest), team status (locked badge unless tier in `pro|diagnostic`).
- **`ReassessNudge.tsx`** — banner: "Your last Health Check was completed in {Month Year}. Ready for your {Q#} Health Check?" where `Q#` = next quarter after `submitted_at`. CTA "Start {Q#} Health Check" → `/health-check/start`. **No day counts.**

### 5. Sidebar lock gating (global)

Update `src/components/app-sidebar.tsx` to consume the same dashboard query (or a lighter `getUserGating` fn) so every page sees the same locks:

| Section / item | Locked when |
|---|---|
| Health Check (both children) | `!profile_complete \|\| !company_profile_complete` |
| Reports (all children) | `assessment_status !== 'complete'` |
| Health Check History | `completedCount < 2` |
| Settings → Team | `tier !== 'pro' && tier !== 'diagnostic'` |

Locked items: render with reduced opacity, lock icon (lucide `Lock`), wrapped in shadcn `Tooltip` showing the unlock condition (e.g. "Complete both profiles to unlock", "Complete your Health Check to unlock", "Complete your next quarterly Health Check to unlock", "Revenue Health Diagnostic™"). Click is a no-op (render as `<span>` not `<Link>`).

To avoid every page re-fetching, gating data is exposed via a small `useGating()` hook backed by a shared queryKey `['dashboard']` — pages already in the auth layout call `ensureQueryData` once at root or rely on cache.

### 6. Out of scope (per request)

- No Health Check flow work.
- No edits to the report routes themselves.
- No mutations.

### 7. Verification

- Manually toggle profile flags in Supabase to verify both states render.
- Confirm sidebar locks update when `profile_complete` / `company_profile_complete` / `assessment_status` / `tier` change.
- Confirm CTA labels use `Q#` not day counts.
- Confirm `--mm-paper` (not `#FFFFFF`) is the main panel background and `--mm-ember` is the only CTA color.

### Files created / changed

- **new** `src/lib/dashboard.functions.ts`
- **new** `src/lib/illustrative-scores.ts`
- **new** `src/components/dashboard/{WelcomeHero,GettingStartedChecklist,TierIncludedCard,ConceptCards,WelcomeBackHeader,ScoreSummaryPanel,InsightCards,ReassessNudge}.tsx`
- **new** `src/hooks/use-gating.ts`
- **edit** `src/routes/dashboard.tsx` — full implementation with loader, both states
- **edit** `src/components/app-sidebar.tsx` — wire lock gating + tooltips
