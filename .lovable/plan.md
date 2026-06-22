## Plan: Wire up brand logo + favicon

### Assets (upload to CDN via lovable-assets)

1. **`RHIcon-Dark.svg`** → `src/assets/rh-icon-dark.svg.asset.json` — use as the site favicon (works on light browser chrome) and as the brand mark on light/paper backgrounds (team-member top bar).
2. **`RH-Icon-Light.svg`** → `src/assets/rh-icon-light.svg.asset.json` — use as the brand mark on dark backgrounds (main app sidebar header).
3. **`RH - Logo - Light.svg`** (full wordmark, white text) → `src/assets/rh-logo-light.svg.asset.json` — use on the dark auth split-layout panel in place of the small "Revenue Health Matrix™" eyebrow.

After upload, the original binaries are not added to the repo — only the `.asset.json` pointers.

### Code changes

1. **Favicon** — `src/routes/__root.tsx` `links: [...]`: add
   `{ rel: "icon", type: "image/svg+xml", href: rhIconDark.url }` (import the dark icon `.asset.json`).

2. **Main sidebar** — `src/components/app-sidebar.tsx` (dark abyss background, lines 172–182):
   Replace the "Revenue Health" text span with `<img src={rhIconLight.url} alt="Revenue Health Visualiser" />` (24px high when expanded; centered 24px icon when `collapsed`).

3. **Team-member top bar** — `src/components/team-member-shell.tsx` (white background, lines 50–61):
   Replace the wordmark `<Link>` text with the dark icon (`rh-icon-dark`) at ~28px height, keep the Link to `/dashboard`, keep ™ semantics via `alt`.

4. **Auth split layout** — `src/components/auth/AuthSplitLayout.tsx` (dark panel, lines 52–64):
   Replace the small uppercase "Revenue Health Matrix™" eyebrow with the full light wordmark logo (`rh-logo-light`) at ~180px wide. The existing headline + faint background graphic underneath are unchanged.

### Not changing

- Brand text elsewhere (footers, page bodies, report headers) — text-only mentions of "Revenue Health Matrix™" / "Revenue Health Visualiser™" stay as-is.
- The faint background SVG diagram in `AuthSplitLayout`.
- No new routes, no token changes, no schema changes.

### Verification

Build passes; manually open `/login` (dark panel shows full wordmark), `/dashboard` (sidebar shows light icon, browser tab shows dark icon), and a team-member session (top bar shows dark icon).