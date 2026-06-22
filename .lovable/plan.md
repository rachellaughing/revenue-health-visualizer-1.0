## Goal

In `src/routes/profile.company.tsx`, the team member view (`TeamMemberCompanyView`) currently renders a simplified single-step `CategoryPainSelector`. Replace it with the **exact same** `SymptomSelector` component the owner uses — same two-step UX (categories → ranked specific pain points, max 5).

## What I'll change (single file: `src/routes/profile.company.tsx`)

1. **Load symptom categories** in `TeamMemberCompanyView` using the existing `getSymptomCategories` server function (already imported and used by the owner view) via `useQuery`.

2. **Change `selected` state semantics** from category keys (e.g. `"sales"`) to symptom codes (`SYM-###`), matching what `SymptomSelector` expects.

3. **Initialize `selected`** from `personal.pain_point_ranking` (filtered to `/^SYM-\d{3}$/`) instead of `pain_point_categories`. This is the field that already stores the ranked list.

4. **Replace the JSX block** (around lines 949–960) — swap `<CategoryPainSelector …>` for:
   ```tsx
   <SymptomSelector
     categories={categories ?? []}
     selected={selected}
     onChange={setSelected}
   />
   ```
   Keep the surrounding `SectionSubheading`, label, helper text, and the open-text TextArea exactly as they are.

5. **Update the save payload** in `onSave`:
   - `pain_point_ranking`: `selected` (SYM codes in selection order — this is the ranking)
   - `pain_point_categories`: distinct categories derived from `selected` by looking up each code's category in the loaded `categories` data
   - `pain_point_open_text`: unchanged

6. **Remove now-dead code**: `CategoryPainSelector` function, `CATEGORY_KEYS` array, `CATEGORY_META` references used only by the removed selector, and the local `toggleCategory` helper. (Verify each isn't used elsewhere before deleting — `CATEGORY_META` is shared with `SymptomSelector`, so keep it.)

## What stays unchanged

- Owner's Company Profile view — untouched
- `saveTeamMemberPerspective` server function and its Zod schema already accept `string[]` for both fields, so no backend change
- Database schema, profile fields written, and 5-item cap
- "What feels harder in your role right now…" open text field
- Read-only Organization Profile section, role fields, save/cancel buttons, navigation
- Every other page in the app

## Verification

- Typecheck (build runs automatically)
- Trace: team member loads page → sees category grid identical to owner's → clicks a category → sees Step 2 pain point statements → ranks up to 5 → saves → `profiles.pain_point_ranking` contains SYM codes in order, `profiles.pain_point_categories` contains the distinct categories
