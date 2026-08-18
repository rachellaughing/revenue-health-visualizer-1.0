# Roadmap Builder remodel

## What I found first (read before approving)

- **`roadmap_selections` has 6 rows, all belonging to a single user** (almost certainly your own test account). Replacing it with `roadmap_task_selections` loses those 6 manual picks. Assuming that's fine — say so if it isn't and I'll leave the old table in place, unused.
- **CSV export today** works off `selections` (system + horizon) and writes one row per *task* of every selected system — the full task list, plus outcome[0] and a positionally-matched KPI. It will be repointed at the new model.
- **`revhealth2.recommended_actions` does not exist yet.** I'll create it empty in this change.
- **Two things I don't have yet:** the 50 authored content rows, and `roadmap-builder-remodel-mockup.html` (not attached to this session). I'll build the "Watch out for" block in the muted/editorial style described (no red — neutral surface, `--mm-mid` text, hairline left rule) and adjust once you send the mockup.
- **Undecided item flagged, not decided silently:** the framing banner will show for *all* tiers including Diagnostic, per the default in your brief.
- **No backfill** when a system is opted out — the bucket simply shows fewer items, matching Top Opportunities.

## Database

New table `revhealth2.recommended_actions`:
`child_system_id` (uuid, FK → child_systems, unique), `title`, `why`, `task_1..task_5`, `outcome_1..3`, `kpi_1..3`, `warning_1..4`. Read-only from the app; SELECT grant to `authenticated`/`service_role`, RLS on with a read policy.

New table `public.roadmap_task_selections`:
`assessment_id`, `user_id`, `child_system_id`, `included boolean default true`, `selected_task_indices int[] default '{}'` with `check (coalesce(array_length(selected_task_indices,1),0) <= 3)`, `updated_at`. Unique on `(assessment_id, child_system_id)`. GRANTs + RLS scoped to `auth.uid()`.
`roadmap_selections` is left in the database but no longer read or written.

Content load is a second migration once you send the 50 rows.

## Server (`src/lib/report.functions.ts`)

- `getRoadmap` joins `recommended_actions` by `child_system_id` and returns per item: `title`, `why`, `tasks[]` (compacted, empty task_5 dropped), `outcomes[]`, `kpis[]`, `warnings[]`, plus `included` and `selectedTaskIndices` from `roadmap_task_selections` (defaults: included, no tasks picked).
- `horizonFor`, `effortFor`, the illustrative fallback and tier logic stay untouched. Illustrative items also read their copy from `recommended_actions`.
- `ROADMAP_CONTENT` and `defaultContent()` are deleted. Any system missing a content row is simply omitted rather than falling back to generated copy.
- `saveRoadmapSelection`/`deleteRoadmapSelection` are replaced by `setRoadmapInclusion({ assessmentId, childSystemId, included })` and `setRoadmapTasks({ assessmentId, childSystemId, taskIndices })`, both upserting one row and keeping the existing assessment-ownership check. Task arrays are validated ≤3 server-side as well as by the DB check.

## Page (`src/routes/revenue.roadmap-builder.tsx`)

- Framing banner above the buckets (exact copy from the brief), CTA pointing at the existing Diagnostic upgrade destination already used elsewhere in the app.
- Each horizon bucket lists only the systems `horizonFor` placed there. No chips-to-pick-from row, no `max` cap, no "N/3 selected" counter.
- Each system card: title, why, task checklist (checkboxes, cap 2–3 — further boxes disabled at 3 with an inline note), Expected outcomes, KPIs, then the "Watch out for" block plus the fixed closing line.
- A "Remove from roadmap" control per card; removed systems collapse to a single muted row with an "Add back" action.
- CSV export: one row per *selected task* of *included* systems only; opted-out systems and unselected tasks are excluded. Columns keep the existing shape.

## Not touched

Horizon thresholds, illustrative fallback behaviour, page shell/breadcrumb/footer, tier gate.
