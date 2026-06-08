# Team Members — Detailed Status

Add a richer status badge to each row in Settings → Team so the owner can see, at a glance, where each invited teammate is in the Health Check.

## Status model

For each `team_members` row, derive one of four statuses:

| Status | Condition | Badge color |
|---|---|---|
| **Invited** | No `user_id` (invite not yet accepted) | Amber |
| **Joined** | `user_id` set, but no assessment row exists for that user | Blue |
| **In progress** | Assessment exists with `status != 'completed'` | Teal |
| **Completed** | Assessment exists with `status = 'completed'` | Green |

"Joined" replaces today's coarse "Active". The team member's assessment is the one whose `user_id = team_members.user_id` (created automatically the first time they open the Health Check, per existing `getHealthCheckData` logic).

## Changes

### 1. `src/lib/team.functions.ts` — `listTeamMembers`
- After loading `team_members`, collect the non-null `user_id`s.
- One extra query: `assessments.select('user_id,status,completed_at,submitted_at').in('user_id', userIds)` via `supabaseAdmin` (per project rule: server fns use `supabaseAdmin`).
- For each member, compute status using the table above. If multiple assessments exist for a user, prefer `completed` > otherwise the most recent.
- Return shape gains a `status` value from the set `"Invited" | "Joined" | "In progress" | "Completed"` (replacing the current "Active"/"Invited" strings). Keep `initials`, `email`, `display_name`, `id` unchanged.
- Optionally include `completed_at` so the UI can show "Completed · 12 May" later (not required for v1).

### 2. `src/components/settings/TeamTab.tsx`
- Update the badge styling map to cover all four statuses:
  - Invited → existing amber (`#FFF4E5` / `#8A5A00`)
  - Joined → blue (`#E3F2FD` / `#0D47A1`)
  - In progress → teal tint (`#E0F2F1` / `#00695C`)
  - Completed → existing green (`#E8F5E9` / `#1B5E20`)
- Update the demo/preview data (locked panel) to showcase all four states so the blurred upsell preview looks richer.
- No layout changes; same row component.

### 3. No schema changes
`team_members.status` already supports `"invited" | "active"`; we don't need to write new values — the UI status is derived live from `assessments`. This keeps the source of truth in the assessment row and avoids drift.

## Out of scope
- Email notifications when status changes
- Per-member drill-in / answers (intentionally — `/team/responses` privacy rule)
- Sorting/filtering by status
