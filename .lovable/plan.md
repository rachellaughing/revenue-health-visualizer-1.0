# Top bar user menu

Replace the static "U" avatar circle in the top-right of every page with a real user menu that shows the user's first name and lets them jump to account settings or sign out.

## What changes

**`src/components/top-bar.tsx`**
- Accept (or fetch) the user's `first_name` and pass it through to a new menu.
- Replace the plain `U` circle with a dropdown trigger that shows:
  - Avatar circle with first initial (existing style, `--mm-abyss` bg)
  - First name next to it (Inter, 13px, `--mm-ink`) — hidden on very narrow screens, initial-only avatar stays
  - Small chevron
- Use the existing shadcn `DropdownMenu` (`src/components/ui/dropdown-menu.tsx`) for the menu.

**Dropdown contents**
1. Header row (non-interactive): first name in bold + email below in muted (`--mm-mid`).
2. `Account settings` → navigates to `/settings?tab=account` (matches existing route).
3. `Billing & Plan` → `/settings?tab=billing` (nice-to-have, same menu, one extra item).
4. Separator.
5. `Sign out` → calls `signOut()` from `useAuth()` then `navigate({ to: "/login", replace: true })` — same pattern already used in `team-member-shell.tsx`.

## Data source for first name + email

- `useAuth()` already exposes `user` (email available as `user.email`).
- For `first_name`, reuse the existing `viewer-context` query that `__root.tsx` already runs (`getViewerContext` → returns `firstName`). Two options:
  - **Preferred:** lift the `viewerQ.data` already in `AuthGate` and pass `firstName` as a prop into `<TopBar />`. Minimal, no extra fetch.
  - Fallback: read `react-query` cache by `["viewer-context"]` key inside `TopBar`.

Plan uses the prop approach: `<TopBar onToggleSidebar={...} firstName={viewerQ.data?.firstName ?? null} email={user?.email ?? null} />`.

## Mobile behaviour

- On `<640px`, hide the first-name text, keep the initial avatar + chevron as the trigger. Dropdown still works.
- Menu uses shadcn defaults (right-aligned to trigger).

## Out of scope

- No changes to `TeamMemberShell` (it already has its own sign-out button + name display in its header).
- No new settings pages, no profile editing here.
- No design-token changes.

## Files touched

- `src/components/top-bar.tsx` — replace avatar with dropdown menu, accept `firstName`/`email` props.
- `src/routes/__root.tsx` — pass `firstName` and `email` props into `<TopBar />`.

No new dependencies (shadcn dropdown-menu and lucide-react already present).