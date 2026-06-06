# Profile Stepper: /profile/personal → /profile/company

Builds the two-page profile stepper matching the attached prototype, wired to the existing Supabase schema. No DB changes.

## Routes

- `/profile/personal` — already exists as stub; replace with real form.
- `/profile/company` — new file `src/routes/profile.company.tsx`.
- Both render inside the app shell (AuthGate). After signup the user already lands on `/profile/personal`.

## Shared UI primitives

New file `src/components/profile/profile-ui.tsx` ports the prototype's shared components using the project's brand CSS tokens (no inline hex — use `var(--mm-*)`):

- `ProgressSteps` (Personal / Company / Done)
- `SectionCard`, `FieldGroup`, `Field`, `Label`, `Helper`
- `TextInput`, `Select`, `TextArea` styled with `--mm-off-white` bg, `--mm-teal` focus border
- Primary `ContinueButton` using `--mm-ember`
- All fonts: Instrument Serif (headings already imported), Inter (UI)

Layout: `max-w-[680px] mx-auto`, page-level padding handled by existing `<main>` in `__root.tsx`. Progress bar at top of each step.

## Personal Profile (`src/routes/profile.personal.tsx`)

State via `react-hook-form` + `zod`:

- `first_name` (required, 1–80)
- `last_name` (required, 1–80)
- `role_title` (required, 1–120)
- `years_in_role` (optional, enum: `<1 year | 1–2 years | 3–5 years | 5+ years`)
- `primary_background` (optional, enum: `Sales | Marketing | Product | Operations | Finance | Founder/General`)
- `email` (display-only, pre-filled from `useAuth().user.email`, disabled with helper "Pre-filled from your account.")

Data load:

- Server fn `getPersonalProfile` (createServerFn, `requireSupabaseAuth`) → `select first_name,last_name,role_title,years_in_role,primary_background,email from profiles where user_id = auth.uid()`.
- Loaded via `useQuery` in the component (route is under public-AuthGate; uses bearer attacher already wired). Pre-fills form via `reset()` once loaded.

Save:

- Server fn `savePersonalProfile` (auth middleware) → `update profiles set ... where user_id = context.userId`, then `await supabase.rpc('refresh_profile_completion', { _user_id: context.userId })`.
- Returns the updated row. On success, navigate to `/profile/company`.
- Toast on error (sonner is already in project).

## Symptom data source

New server fn `getSymptomCategories` (auth middleware, but framework data is non-sensitive):

- Uses `supabaseAdmin` (inside `await import(...)` per import-graph rules) to query `revhealth2.symptom_map` — that schema is not exposed via PostgREST so the user-scoped client cannot reach it.
- Returns `[{ category, symptoms: [{ symptom_code, symptom }] }]` grouped by `category`, ordered by `symptom_code`.
- Category presentation (icon + helper description) is mapped client-side from a small static lookup keyed by the canonical category names returned by the DB (Revenue & Growth, Sales, Marketing, Customer Success & Friction, Brand & Market, Leadership & Scaling, Team & Operations, People & Culture, Visibility & Data).
- Cached via React Query with `staleTime: Infinity` (taxonomy is static).

## Company Profile (`src/routes/profile.company.tsx`)

Five `SectionCard`s exactly as in prototype:

1. **Business Basics** — `company_name*`, `industry*` (B2B SaaS / B2B Services / Marketplace / E-commerce / Other), `business_model` (Subscription / Project-Retainer / Transactional / Mixed), `founded_year` (smallint), `headquarters`, `website`.
2. **Scale & Stage** — `annual_revenue*` (<$500K / $500K–$1M / $1M–$2M / $2M–$5M / $5M–$10M / $10M+), `funding_stage*` (Bootstrapped / Pre-seed / Seed / Series A / Series B / Series C+), `total_headcount` (1–10 / 11–25 / 26–50 / 51–100 / 100+), `revenue_org_size` (int).
3. **Revenue Environment** — `acv`, `cac`, `estimated_ltv` (numeric); `avg_sales_cycle`, `avg_close_rate`, `annual_churn` (enums per prototype).
4. **Growth Context** — `primary_growth_constraint`, `primary_sales_motion`, `revenue_model`, `has_defined_icp` (Yes / Partially / No).
5. **Operational Friction** — `pain_points` (required, ≥1, ≤5) via `SymptomSelector`; `open_friction_text`.

`SymptomSelector` component (matches prototype):

- Grid of category cards; tap to expand into the Step-2 list.
- Tapping a symptom toggles inclusion in `pain_points`; insertion order = rank. Cap at 5; over-cap items render disabled.
- Counter badge per category, ranked summary chip-list at bottom with × to remove.
- Stores `symptom_code` strings (e.g. `SYM-007`) as `text[]`.

Data load:

- Server fn `getCompanyProfile` → `select * from company_profiles where user_id = auth.uid()` (row already exists from signup trigger).
- Pre-fills the form via `reset()`.

Save:

- Server fn `saveCompanyProfile` → `update company_profiles set ... where user_id = context.userId` (use `update`, not insert — stub row exists). Validate via zod; coerce empty strings to `null` for nullable columns; coerce numerics with `z.coerce.number().nullable()`.
- Then `await supabase.rpc('refresh_profile_completion', { _user_id: context.userId })`.
- On success, navigate to `/dashboard`.

Footer has "← Previous" (back to `/profile/personal`) + ember "Save Profile & Continue →".

## Server function files

All in `src/lib/profile.functions.ts` (client-safe path):

- `getPersonalProfile`, `savePersonalProfile`
- `getCompanyProfile`, `saveCompanyProfile`
- `getSymptomCategories`

Each `.middleware([requireSupabaseAuth])`, each `.inputValidator(z.parse)` where applicable. Secrets/admin client loaded inside handlers only.

## Validation & Test Plan

After build, manually validate against Supabase:

1. Sign in as the existing test user, fill /profile/personal, save. Verify `profiles` row has `first_name/last_name/role_title/years_in_role/primary_background` set and `profile_complete = true`.
2. Fill /profile/company including ≥1 pain point, save. Verify `company_profiles` row populated, `pain_points` is `text[]` of symptom_codes in chosen rank order, and `profiles.company_profile_complete = true`.
3. Re-open both pages — fields must pre-fill.

## Out of scope

- No /dashboard build (route exists as stub; redirect target only).
- No Done step screen (prototype `ProfileComplete`) — flow goes straight to /dashboard per spec.
- No schema migrations, no RLS changes, no edits to `handle_new_user` or `refresh_profile_completion`.
