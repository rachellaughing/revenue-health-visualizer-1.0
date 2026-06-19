Add a team-member experience to `/profile/company` that detects `profile.team_owner_id` and renders a read-only Organization Profile (owner's data) plus an editable "Your Perspective" section. Team-owner and independent-user flow is untouched.

## 1. Migration (flagged for review)

Add an RLS policy so a team member can read their owner's profile row:

```sql
create policy "Team members can view their owner's profile"
  on public.profiles for select
  using (
    auth.uid() in (
      select id from public.profiles
      where team_owner_id = profiles.id
    )
  );
```

This is the policy text the user supplied. I'll submit it via the migration tool for approval before applying.

## 2. New server functions (`src/lib/profile.functions.ts`)

- `getOwnerCompanyView` — for the current user, returns `{ owner_profile, owner_company }`. Reads my own profile to get `team_owner_id`, then loads the owner's `profiles` row (first_name, last_name, business_name) and `company_profiles` row (all the read-only fields listed in the brief). Uses `supabaseAdmin` per project convention. Returns `null` when the user has no team owner.
- `saveTeamMemberPerspective` — updates ONLY the current user's `profiles` row with:
  - `first_name`, `last_name`, `role_title`
  - `job_function` (new column)
  - `pain_point_categories` (jsonb array of category keys, in selection order)
  - `pain_point_ranking` (jsonb mirror of selection order — index 0 = most painful)
  - `pain_point_open_text`
  Calls `refresh_profile_completion` afterwards. Never writes to the owner's profile or to `company_profiles`.

## 3. Route changes (`src/routes/profile.company.tsx`)

- On load, fetch the current user's personal profile (already available via `getPersonalProfile`) and extend it to also return `team_owner_id`. Branch:
  - `team_owner_id == null` → render existing `<OwnerCompanyForm />` (current component, extracted, no behavior change).
  - `team_owner_id != null` → render `<TeamMemberCompanyView />`.

- `<TeamMemberCompanyView />` layout (matches existing `SectionCard` styling):

  **Section 1 — Organization Profile (read-only)**
  - Header: `ORGANIZATION PROFILE` (eyebrow) + sub `Managed by {first_name} {last_name}` with a 12px Lucide `Lock` icon in `--mm-ink-soft` next to the eyebrow.
  - Renders the 17 fields from the brief (`business_name` shown as "Company Name", plus Industry, Business Model, Founded Year, Headquarters, Website, Annual Revenue, Funding Stage, ACV, CAC, Estimated LTV, Avg Sales Cycle, Avg Close Rate, Annual Customer Churn, Primary Growth Constraint, Primary Sales Motion, Revenue Model, defined ICP).
  - Display is styled read-only text inside the same `Field` layout — same labels, same grid as the owner form. Empty fields show an em-dash.

  **Section 2 — Your Perspective (editable)**
  - Header: `YOUR PERSPECTIVE` + sub `Your role and what you're seeing from your seat`.
  - 2a "Your Role": First Name, Last Name, Job Title/Role (text inputs), Job Function (select with the 9 options in the brief).
  - 2b "Your Pain Points": new `CategoryPainSelector` — 9 fixed category cards (the keys/labels/icons from `CATEGORY_META` already in this file). Click toggles selection (max 5); selected cards show a numeric badge equal to their selection index + 1. Right-hand ranked list shows the categories in selection order with remove buttons (same visual pattern as the existing symptom selector, but operating on category keys rather than SYM-### codes).
  - 2c Open-ended `TextArea` mapped to `pain_point_open_text`.
  - Single `PrimaryButton` "Save" at the bottom of Section 2. Disabled until First Name, Last Name, Role, and Job Function are non-empty.

- Pre-fill from the current user's `profiles` row (extend `getPersonalProfile` to also return `job_function`, `pain_point_categories`, `pain_point_ranking`, `pain_point_open_text`, and `team_owner_id`).

## 4. Data model notes

- `pain_point_categories` and `pain_point_ranking` both store the same ordered array of category keys (e.g. `["revenue_growth", "sales", "marketing"]`). Storing both keeps it consistent with the column definitions added in the prior migration; ranking is the index in the array.
- No changes to `company_profiles`. Team members never write to it.
- No changes to the owner profile page, independent-user flow, or any other route.

## 5. Out of scope

- Owner Company Profile page UI
- Independent (non-team) user flow
- Assessment, scoring, dashboard, reports

## Confirmations before I build
1. The migration in step 1 needs your review/apply. I'll submit it via the migration tool and wait for approval before writing the read of the owner's profile.
2. Category keys for `pain_point_categories` will be the snake_cased versions of the 9 category names already used on the owner page (e.g. `revenue_growth`, `sales`, `marketing`, `customer_success`, `brand_market`, `leadership_scaling`, `team_operations`, `people_culture`, `visibility_data`) — OK?