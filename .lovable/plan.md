# Top Opportunities dark-mode token fix

## Changes
- Audit `src/routes/reports.top-opportunities.tsx` for invalid CSS-variable alpha concatenation, fixed light surfaces, and literal rule colors.
- Replace alpha concatenation with `color-mix(in srgb, ...)` and use the existing `--mm-off-white`, `--mm-abyss`, and `--mm-rule` tokens where appropriate.
- Preserve all data fetching, logic, layout, spacing, and behavior.

## Verification
- Run a targeted TypeScript check for the edited route.
- Confirm the latest preview build result is clean.
