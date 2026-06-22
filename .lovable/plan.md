## Team-member experience for Settings + Dashboard

### 1. Surface owner data to the client

Extend `getViewerContext` (`src/lib/viewer.functions.ts`) so the `teamMember` payload includes the fields needed for the new copy:

- `ownerLastName: string | null` (add to select on `profiles`)
- `ownerEmail` is already returned
- `ownerFirstName` is already returned

Also fix a latent role-check mismatch in the same file: the DB stores `profiles.role = "member"` (see `team.functions.ts` `activateTeamMembership`), but `getViewerContext` only flips to `team_member` when the value is `"team_member"`. Change the check to treat both `"member"` and `"team_member"` as team-member viewers. This is what currently keeps Rick out of `TeamMemberDashboard`/team‑member Settings and is the prerequisite for everything below.

No schema changes, no other server-function changes.

### 2. Settings page — hide the Team tab for members

In `src/routes/settings.tsx`:

- Call `getViewerContext` via `useQuery` and derive `isMember = viewer?.role === "team_member"`.
- Build the `TABS` array dynamically: omit `{ key: "team", … }` when `isMember`.
- In `validateSearch`, if `tab === "team"` for a member, coerce to `"account"` so a direct `/settings?tab=team` URL doesn't render a hidden tab.

No change to the Account tab.

### 3. Billing & Plan tab — member variant

In `src/components/settings/BillingTab.tsx`, branch at the top of the component on viewer role (fetched via `getViewerContext`). Owner path is unchanged.

When `isMember`, render only:

**Card 1 — Current plan (no upgrade UI):**

```
CURRENT PLAN
Revenue Health Assessment™

Your access is provided through {ownerFirstName} {ownerLastName}'s organization.
To make changes to your plan, contact {ownerFirstName} at {ownerEmail}.
```

Styling matches the existing "current plan card" (white panel, paper background, Instrument Serif title). No `TierBadge`, no upgrade panel, no coupon row, no diagnostic link.

**Card 2 — "Want to go deeper?":**

Same card chrome as Card 1. Body copy verbatim from the spec, with `{ownerFirstName}` interpolated. Primary CTA button uses `--mm-ember`:

```
Send {ownerFirstName} a nudge →
```

The button is a plain `<a>` with a `mailto:` href:

- `to`: `ownerEmail`
- `subject`: `Revenue Health Diagnostic — worth a look`
- `body`: spec copy verbatim, with `{ownerFirstName}` and `{memberFirstName}` (= `viewer.firstName`) interpolated

URL-encode subject + body, fall back gracefully (hide the button) if `ownerEmail` is missing.

### 4. Dashboard — completion nudge for members

The existing `TeamMemberDashboard` (`src/components/team-member-dashboard.tsx`) already branches between in-progress and completed; update its copy to match the spec instead of layering a second banner.

- **In-progress / not started** (`completion_pct < 100`): replace the current hero copy with a banner that reads:

  > Complete your Health Check to unlock the Team Alignment report for {ownerFirstName}'s organization.

  Keep the existing `Continue Health Check →` / `Start Health Check →` CTA (already links to `/health-check`). Keep the three info tiles below.

- **Completed**: in `CompletedCard`, swap the body copy for:

  > ✓ Your responses have been added to the Team Alignment report. {ownerFirstName} can now see where your perspective adds to the leadership view.

  Remove the CTA per spec (the "Questions? Contact …" mailto stays).

The `ownerFirstName` comes from the already-fetched `viewer.teamMember`.

### 5. What is explicitly unchanged

- `getDashboardData` and the owner Dashboard path
- Owner Billing & Plan view (entire existing component renders unchanged when `role !== "team_member"`)
- Owner Team tab and `TeamTab` component internals
- All other routes, server functions, schema, RLS, and migrations

### Technical notes

- The fastest place to read role on the client is `getViewerContext` (already used by Dashboard). `BillingTab` and `settings.tsx` will both add a `useQuery(["viewer-context"], …)` — React Query dedupes so it's a single network call.
- The role-check fix in `getViewerContext` is the same class of bug as the recent `team_owner_id` lookup: a DB-stored value that disagrees with the discriminator string the code compares against. Without the fix, Rick still falls through to the owner branch and none of the member-only UI above will render.
