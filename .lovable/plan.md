# Diagnostic Page — Implementation Plan

## Scope
Replace the existing minimal `/diagnostic` route with a full in-app page that matches the report-page design system, and add a sidebar entry under **Revenue Intelligence**.

## Files to change

### 1. `src/routes/diagnostic.tsx` (rewrite)
Rebuild as an authenticated, in-app page styled like other report routes (`reports.executive-summary.tsx` token set: `--mm-abyss` sidebar, `--mm-paper` cream main, Instrument Serif display, Inter body, ember CTA).

Sections, in order:
1. **Hero** — dark green `#1C2B2B`, full width. Eyebrow "REVENUE HEALTH DIAGNOSTIC™" (ember), large serif headline, muted-white subhead, score pill badge (overall score + assessment label from latest assessment), ember CTA "Book a Discovery Call" that smooth-scrolls to the form (`#discovery-form`).
2. **Founder Blindspots blurb** — cream, max-width prose, external link to `https://marketplacemaven.com/core-concepts/founder-blindspots/` (target=_blank, rel=noopener noreferrer).
3. **PBJ Sessions™ card** — dark green card, 2-col layout. Left: copy + external link to `https://marketplacemaven.com/core-concepts/pbj-session/`. Right: 4-step visual list (Leadership interviews → Cross-functional sessions → Shadow Systems™ surface → Contradictions documented).
4. **Diagnostic report cards** — cream, 2-col grid, 5 cards each with colored top border, lock badge, title, description, "CONFIRMED IN DIAGNOSTIC™" ember footer label. Roadmap Builder card spans full width. Colors: Health Check History `#F05223`, Team Alignment `#2BB457`, Founder Dependency `#223F99`, Shadow Systems™ `#DE1A58`, Roadmap Builder `#05A4A3`.
5. **Process timeline** — cream, 4-col grid: Week 01 Discovery / Week 02 PBJ Sessions™ / Week 03 Systems Analysis / Week 04 Strategic Roadmap.
6. **Discovery form** — white card, `id="discovery-form"`. Read-only display of first_name + email from authenticated profile. Two optional textareas (open_comments, team_members). Ember submit "Send my info — I'll look for the calendar link". Small note below button.

### Data wiring
Use `useQuery` with the existing `getDashboardData` server fn to read:
- `profile.first_name`, latest assessment, `overallScore` → hero badge + form prefill.

For email + company fields needed in the webhook payload, reuse existing server fns:
- `getPersonalProfile` → `email`
- `getCompanyProfile` → `company_name`, `annual_revenue`, `funding_stage`

Three parallel `useQuery` calls; render hero/form once profile data resolves (skeleton while loading).

### Form submit
Client-side `fetch` POST (no server fn — third-party webhook, no secrets needed) to:
```
https://services.leadconnectorhq.com/hooks/srok4ARuusOq59OlGRRs/webhook-trigger/3794cbdf-5a0c-4c0b-aa46-2ba67918fff6
```
JSON payload:
```
{ first_name, email, company_name, revenue_health_score,
  funding_stage, annual_revenue, open_comments, team_members }
```
On success: replace form with confirmation message ("You're all set. Check your inbox…"). On error: inline error + retry.

### 2. `src/components/app-sidebar.tsx` (edit)
Add one item to the `REVENUE INTELLIGENCE` section array:
```ts
{ title: "Diagnostic", url: "/diagnostic", icon: Stethoscope }
```
No `lock` field (accessible to all tiers per spec). Import `Stethoscope` from `lucide-react`.

## Out of scope
- No DB migrations, no new server functions, no changes to other pages or styles.
- No tier gating on the route itself.

## Open question
The existing `/diagnostic` route currently links externally to `https://marketplacemaven.com/diagnostic` from `diagnostic.tsx`. I will replace that page entirely — confirming this is intended (you asked for a brand-new in-app page at `/diagnostic`, which collides with the existing one).
