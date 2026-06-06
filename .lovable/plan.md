
## Goal

Build only the visual shell of the app. No Supabase, no data fetching, no auth, no forms, no mock data layer. Every nav item routes to a placeholder page that renders just its title.

## Design tokens (added to `src/styles.css`)

- `--background: #FFFEFA` (never pure white)
- `--sidebar: #182829`
- `--primary: #F05223` (only CTA color)
- Top bar border: `#F5F5F0`
- Fonts loaded via Google Fonts `<link>` in `src/routes/__root.tsx` head:
  - Instrument Serif → display headings
  - Inter → all UI
- Register `--font-display` and `--font-sans` in `@theme` so `font-display` / `font-sans` utilities work.

## Layout

`src/routes/__root.tsx` becomes the shell:

```
┌─────────┬──────────────────────────────┐
│ Sidebar │  TopBar (56px, sticky)       │
│ 240px   ├──────────────────────────────┤
│ #182829 │  <Outlet /> on #FFFEFA       │
│ collap- │                              │
│ sible   │                              │
└─────────┴──────────────────────────────┘
```

- Sidebar: fixed 240px when expanded, collapses to a narrow icon rail (~64px). Collapse toggle lives in the top bar.
- Top bar: 56px, sticky, `#FFFEFA` bg, `1px solid #F5F5F0` border-bottom, holds the collapse trigger + a static user avatar placeholder (logged-in stub, no auth).
- Main panel scrolls under the sticky top bar on `#FFFEFA`.

## Sidebar component (`src/components/app-sidebar.tsx`)

Accordion-style sections (each section header is a collapsible group; sections default open). Section labels rendered in Inter, uppercase, white at 50% opacity, 11px tracking-wide.

Sections + items (exact):

- **HOME** — Dashboard, Personal Profile, Company Profile
- **HEALTH CHECK** — Start / Resume, Health Check History
- **REPORTS** — Executive Summary, Revenue System Health, Top Opportunities, Revenue at Risk, Team Alignment, Founder Dependency
- **REVENUE INTELLIGENCE** — Matrix Map, Shadow Systems, Roadmap Builder
- **SETTINGS** — Account, Billing & Plan, Team

Nav item rules:
- Inactive: white text at 70% opacity, transparent bg.
- Active: 3px left border `#F05223`, background `rgba(255,255,255,0.05)`, white text at 100%.
- Determined by current pathname via `useRouterState`.
- Each item uses a Lucide icon (kept visible in collapsed rail).

Built with the shadcn `Sidebar` primitives already in the project, themed via overrides so the sidebar bg is `#182829` regardless of light/dark token defaults.

## Routes

One file per nav item under `src/routes/`. Each file exports a `createFileRoute` whose component renders only `<h1>` with the page title in Instrument Serif. No other content.

```
src/routes/
  index.tsx                          → /                          "Dashboard"
  personal-profile.tsx               → /personal-profile
  company-profile.tsx                → /company-profile
  health-check.start.tsx             → /health-check/start        "Start / Resume"
  health-check.history.tsx           → /health-check/history
  reports.executive-summary.tsx
  reports.revenue-system-health.tsx
  reports.top-opportunities.tsx
  reports.revenue-at-risk.tsx
  reports.team-alignment.tsx
  reports.founder-dependency.tsx
  revenue.matrix-map.tsx
  revenue.shadow-systems.tsx
  revenue.roadmap-builder.tsx
  settings.account.tsx
  settings.billing.tsx
  settings.team.tsx
```

`src/routes/index.tsx` replaces the current placeholder; it becomes the Dashboard page (title only).

## Out of scope (explicitly NOT doing)

- No Supabase client, queries, or env wiring.
- No auth flow — user avatar in top bar is a static circle.
- No forms, no mock data arrays beyond the nav config.
- No additional pages, charts, tables, or section bodies beyond the `<h1>` title.

## Deliverables

1. Updated `src/styles.css` with brand tokens + font registration.
2. Google Fonts `<link>` tags in `__root.tsx`.
3. New `src/components/app-sidebar.tsx` and `src/components/top-bar.tsx`.
4. `__root.tsx` updated to render `SidebarProvider` + sidebar + top bar + `<Outlet />`.
5. All 17 route files listed above, each rendering only its title.
