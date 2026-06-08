## Goal

On mobile (≤768px), make horizontal rows in the report pages stack vertically so cards stop getting squeezed side-by-side. Pure CSS in `src/styles.css` — no JSX changes, no business logic touched.

## What I'll add to `src/styles.css` (mobile block)

1. **Grid `1fr auto` collapse** (the case we already identified)
   ```css
   div[style*="grid-template-columns: 1fr auto"] {
     grid-template-columns: 1fr !important;
   }
   ```
   Affects: Matrix Map teaser, Tier CTA card, founder-dependency hero, exec-summary side-by-side cards.

2. **Flex rows with `space-between` → stack vertically**
   ```css
   main div[style*="display: \"flex\""][style*="space-between"],
   main div[style*="display:flex"][style*="space-between"] {
     flex-direction: column !important;
     align-items: stretch !important;
     gap: 12px !important;
   }
   ```
   (Inline-style attribute selectors match the exact serialized string React emits, so we need both spacing variants.)

   This catches the ~12 `justifyContent: "space-between"` rows across:
   - reports.executive-summary (lines 415, 710)
   - reports.founder-dependency (840, 1153, 1329)
   - reports.revenue-system-health (683, 736)
   - reports.team-alignment (353, 459, 608)
   - revenue.matrix-map (111, 846)

3. **Carve-outs for rows that should stay horizontal**
   Small header rows (back button + title, breadcrumb + chip) look fine side-by-side and would look worse stacked. I'll add an opt-out via a wrapper class check — practically: limit the rule to rows whose inline style also contains `marginBottom` ≥ 16 or a `padding` token typical of card bodies, OR exclude rows where `alignItems: "center"` is set on a small header. Pure CSS can't perfectly distinguish, so the pragmatic approach:
   - Apply the stacking rule broadly first
   - You eyeball the preview; I tune carve-outs by adding more specific `[style*="..."]` excludes for the 1-2 header rows that shouldn't stack

4. **Keep existing rules** (grid collapses, padding overrides) untouched.

## Out of scope

- No edits to any `.tsx` file
- No changes to desktop layout (all rules inside `@media (max-width: 768px)`)
- No changes to the health-check flow

## After applying

Switch your preview to mobile, scroll each report page, and call out any specific row that:
- stacked but shouldn't have (I'll add an exclude selector), or
- is still horizontal and feels squeezed (I'll add another selector).

Expect 1–2 iterations to tune.
