## Goal

Give users with `profiles.role = 'team_member'` a completely separate, minimal experience: simple shell (logo + one nav item), invite-context dashboard, and the existing Health Check flow scoped to the founder's selected subsystems. Owners are unaffected.

## 1. Server function: `getViewerContext`

New `src/lib/viewer.functions.ts` (auth-protected, `supabaseAdmin`):

Returns:
```ts
{
  role: 'owner' | 'team_member',
  userId, firstName,
  // team_member only:
  teamMember?: {
    ownerUserId, ownerFirstName, ownerEmail,
    companyName,
    parentAssessmentId,        // owner's most recent completed assessment
    parentSelectedChildIds: string[],
    ownAssessmentId?: string,  // team member's own (in_progress|completed) row, if any
    ownStatus?: string,
    ownCompletionPct?: number,
    lockDate?: string,         // submitted_at + 7d if completed
  }
}
```

Logic: read `profiles.role`. If `team_member`, walk `team_members → teams.owner_id → profiles + company_profiles`, then look up owner's latest `assessments` where `status='completed'` (fallback to most recent if none completed) to grab `id` and `selected_child_ids`, and look up team member's own assessment via `user_id = self AND parent_assessment_id IS NOT NULL`.

Cached as `['viewer-context']`. Single source of truth for routing + shell decisions.

## 2. Conditional shell in `__root.tsx`

After `AuthGate` confirms `session`, fetch `getViewerContext` via `useQuery`. While loading, keep current "Loading…" splash. Then branch:

- `role === 'owner'` → existing `AppSidebar` + `TopBar` layout (no change).
- `role === 'team_member'` → new `TeamMemberShell` (see §3).

This also unblocks the route guard: the shell decides what's rendered, not each route.

## 3. New `src/components/team-member-shell.tsx`

Stripped layout, no sidebar:
- Slim top bar: Revenue Health Visualiser™ wordmark left, single "Health Check" `<Link to="/health-check">`, user menu (name + sign out) right.
- `<main>` paper background, centered content, `<Outlet />`.
- No reports, no revenue intelligence, no billing, no settings entries anywhere.

## 4. Route guard for team members

Inside `TeamMemberShell` (or the wrapping branch in `__root.tsx`):

```ts
const ALLOWED = ['/dashboard', '/health-check'];
if (!ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'))) {
  navigate({ to: '/dashboard', replace: true });
}
```

Silent redirect — no flash. Owners never hit this code path.

## 5. Team-member dashboard

Modify `src/routes/dashboard.tsx`: at top of component, read `viewer-context`. If `role === 'team_member'`, render a new `TeamMemberDashboard` component instead of the owner dashboard. Owner path untouched.

`TeamMemberDashboard` (new file `src/components/team-member-dashboard.tsx`):
- Single centered max-w card on `--mm-paper`.
- Dark `#182829` header card: eyebrow "TEAM HEALTH CHECK", Instrument Serif heading "You've been invited to complete a Health Check.", body copy interpolating `ownerFirstName` + `companyName`, ember CTA `<Link to="/health-check">Start Health Check →</Link>`.
  - If `ownStatus === 'in_progress'` → CTA label "Resume Health Check →".
  - If `ownStatus === 'completed'` → render the completion card from §7 instead of the invite card.
- Below: three small info tiles (Anonymous · 15–20 mins · Quarterly).

## 6. Team-member Health Check entry

`src/routes/health-check.index.tsx` is the existing flow. Add a thin entry decision at the top of its component:

1. Read `viewer-context`.
2. Owner → existing behaviour, unchanged.
3. Team member:
   - On first mount, if no `ownAssessmentId`, call a new server fn `ensureTeamMemberAssessment` that inserts `{ user_id: self, parent_assessment_id: parentAssessmentId, status: 'in_progress', tier_at_start: 'team_member', selected_child_ids: parentSelectedChildIds }` and returns the new id. Invalidate `viewer-context`.
   - Skip the subsystem-selection step entirely — the parent's `selected_child_ids` are already on the row.
   - Render the same question flow, same auto-collapse, same per-subsystem progress.
   - Render a persistent banner at the top: "You are completing this Health Check on behalf of [Company Name]. Your responses are anonymous."

Implementation note: the existing flow keys off the user's own assessment row; because we insert one with the founder's `selected_child_ids`, the existing renderer "just works" for the question loop. The only branch is (a) suppress subsystem-selection UI and (b) show the banner.

## 7. Team-member completion screen

When the team member's assessment hits `completion_pct = 100`:

- Server fn `submitTeamMemberAssessment` sets `status='completed'`, `submitted_at=now()`, and updates `team_members.status='active'` for `user_id = self`. Invalidates `viewer-context`.
- Render dark completion card:
  - "✓ Health Check Complete"
  - Heading "Your responses have been submitted."
  - Body interpolating `companyName` + `ownerFirstName`.
  - No "View Your Report" button.
  - Secondary link "Questions? Contact [ownerEmail]" → `mailto:`.
- Muted note below: "You can return to update your answers until [submitted_at + 7 days]. After that your responses will be locked."

Also surface this card on `/dashboard` for team members once completed (per §5).

## 8. RLS / data safety

All new server fns use `supabaseAdmin` (per project rule). No client query ever touches another user's responses. Team member never sees scores, reports, or revenue data — guard in §4 enforces this and no UI in §3/§5/§7 exposes any.

## Technical notes

- New files: `src/lib/viewer.functions.ts`, `src/components/team-member-shell.tsx`, `src/components/team-member-dashboard.tsx`, `src/lib/team-member-assessment.functions.ts` (ensure + submit).
- Edited files: `src/routes/__root.tsx` (shell branch), `src/routes/dashboard.tsx` (dashboard branch), `src/routes/health-check.index.tsx` (entry decision + banner + skip subsystem step).
- No schema changes; columns already exist.
- No edits to owner-only files (sidebar, billing, settings, reports, revenue intelligence).
- No new dependencies.

## Out of scope

- Owner-side "view team responses" UI (already exists per project knowledge — `/team/responses` + `team_aggregate_scores` view).
- Email-sending or invite-acceptance flow changes.
- Editing the 7-day lock window logic (DB trigger `guard_responses_immutable` already enforces it).
