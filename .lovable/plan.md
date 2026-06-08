## Mobile improvements — round 2

Three changes, all scoped to `<768px`. Desktop layout is unchanged.

### 1. Sidebar → slide-out drawer on mobile

**File:** `src/routes/__root.tsx`, `src/components/app-sidebar.tsx`, `src/components/top-bar.tsx`

- Add `mobileOpen` state in `AuthGate` alongside the existing `collapsed` state.
- On mobile (`useIsMobile()`), render `AppSidebar` as a fixed-position overlay panel (left: 0, width 280px, full height, z-50, translateX based on `mobileOpen`) with a dark backdrop behind it (z-40, click to close).
- Desktop continues to render the sidebar inline in the flex row using the existing `collapsed` prop.
- `TopBar` hamburger calls `onToggleSidebar` — on mobile it toggles `mobileOpen`, on desktop it toggles `collapsed` (same behaviour as today).
- Auto-close drawer on route change (`useEffect` on `pathname`).
- Body scroll lock while drawer is open.

### 2. Bottom tab bar (mobile only)

**New file:** `src/components/bottom-tab-bar.tsx`
**Wired in:** `src/routes/__root.tsx`

- Fixed bottom bar, height 56px + `env(safe-area-inset-bottom)`, hidden ≥768px.
- 4 tabs: Dashboard, Health Check, Reports (→ `/reports/executive-summary`), Settings (→ `/settings/account`).
- Icons from `lucide-react` (LayoutDashboard, ClipboardCheck, FileBarChart, Settings).
- Active state via `useRouterState` pathname prefix match — ember color for active, mid for inactive.
- Add `padding-bottom: calc(56px + env(safe-area-inset-bottom))` to the `<main>` element on mobile so content isn't hidden behind the bar.
- Not rendered for `team_member` role (TeamMemberShell is separate).

### 3. Team tab — stacked mobile layout

**File:** `src/components/settings/TeamTab.tsx`

- Invite form: on mobile, change the form's flex from row to column (`flexDirection: window.innerWidth < 768 ? "column" : "row"` via `useIsMobile()`), input full width, button full width below it.
- Member row: on mobile, restructure each `<li>` into a vertical card:
  - Row 1: avatar (36×36) + name/email (flex row)
  - Row 2: status badge (left-aligned)
  - Row 3: Resend (if invited) + Remove buttons, full-width, side-by-side with `flex: 1`
- Desktop layout (single horizontal row) preserved by branching on `useIsMobile()`.
- Card padding bumped slightly on mobile (14px → 16px) for touch comfort.

### Out of scope (deferred)

- Health Check one-question-per-screen
- Reports mobile (matrix carousel, KPI card lists)
- Dashboard mobile stack

### Technical notes

- `useIsMobile()` already exists at `src/hooks/use-mobile.tsx`; returns `false` during SSR (initial `undefined` → `!!` = false), so mobile-only UI mounts after hydration. No SSR/hydration mismatch because the drawer/bottom-bar start in their desktop-equivalent state.
- No new dependencies. No route changes. No server function changes.
- Tokens used: `--mm-paper`, `--mm-abyss`, `--mm-ember`, `--mm-mid`, `--mm-off-white` — no new colors.
