## Restore the full app layout for team members

### Root cause

`src/routes/__root.tsx` (lines 194–201) swaps the entire authenticated shell for the stripped-down `TeamMemberShell` whenever `viewer.role === "team_member"`:

```tsx
if (viewerQ.data?.role === "team_member") {
  return (
    <>
      <TeamMemberShell firstName={viewerQ.data.firstName} />
      <Toaster />
    </>
  );
}
```

`TeamMemberShell` renders only a minimal top bar (logo + "Health Check" link + sign‑out) with `<Outlet />` underneath — no sidebar, no `TopBar`, no `BottomTabBar`. Before the recent viewer-context fix that made `role === "member"` actually evaluate as `team_member`, this branch never ran for real members, so Rick saw the full owner shell. Once the role check started working, this branch took over and stripped the chrome on every route — including `/health-check`.

The team-member-specific "anonymous" banner the user wants to keep already lives inside the Health Check content itself (`src/routes/health-check.index.tsx` ~line 1365, gated on `data.isTeamMember`). It is independent of the outer shell.

### Fix

Delete the `TeamMemberShell` branch in `src/routes/__root.tsx` so team members fall through to the same shell owners see (sidebar + top bar + bottom tab bar + `<Outlet />`). Also drop the now-unused `TeamMemberShell` import.

That's the entire change to restore the reported behavior. The full owner shell will render on every authenticated route for members — matching the user's spec ("the same layout an owner sees when taking their Health Check") — and the in-page anonymous banner on `/health-check` is unaffected.

### Explicitly not changing

- `TeamMemberShell` component file — left in place; no other route references it, but I'll leave the file rather than delete it in case it's wanted later. (Happy to delete it if you'd prefer.)
- `health-check.index.tsx` — no edits; the existing `data.isTeamMember` banner and `TeamMemberCompletionInline` keep working as-is.
- `TeamMemberDashboard` rendered from `/dashboard` — still works because that branching lives inside `dashboard.tsx`, not in the root shell.
- `viewer.functions.ts` role detection — keep the `member`/`team_member` fix from the previous turn; it's still required for the in-page banner, Billing tab variant, and dashboard variant to render.
- No route guards added/removed. The `ALLOWED_PREFIXES` redirect logic inside `TeamMemberShell` (which forced members onto `/dashboard` or `/health-check`) goes away with the shell; if you later want to restrict members from `/reports/*` etc., that's a separate piece of work.
- No schema, server-function, or RLS changes.
