# OpenBites — Implementation plan v1

Based on [SPEC.md](SPEC.md). Each task is a verifiable vertical slice; the next one starts only when the previous is green.

## Structure
```
src/
  core/          # pure TS, no React or Supabase — all domain logic
    types.ts       # Food, Dish, DayType, Menu, Day, Meal, Item, Macros
    macros.ts      # item/meal/day/menu totals, units→grams, tolerance checks
    adjuster.ts    # 1–2 move search, least squares, rounding, ranking
    packages.ts    # package simulation, waste warnings, shopping list
    *.test.ts      # Vitest
  db.ts          # Supabase client + load/save hook
  App.tsx        # navigation: Menu | Foods | Goals
  pages/         # one file per screen + dialogs
supabase/
  schema.sql     # table + RLS
  keep-alive.sql # keep-alive function for the free tier
```
A single `objects (kind, data jsonb)` table with RLS: every food, dish, day type or menu is a row holding its JSON. Adding a dish to a meal copies its items (items are always food + amount).

## Tasks
1. ✅ **Scaffold**: Vite + React + TS, Vitest, `schema.sql`, Supabase project.
2. ✅ **core/macros** + tests: totals, units, free meals excluded, daily tolerance ±20 kcal / ±5 g.
3. ✅ **Login + Foods**: magic link, food CRUD (per 100 g, g/unit, package, never-suggest, min/max).
4. ✅ **Day types** (Goals screen). Dishes: pending, to be added from the menu cell.
5. ✅ **Menu editor as the main screen**: spreadsheet grid (days × meals), per-day totals vs goal in the header, create foods from a cell.
6. ✅ **core/adjuster** + tests: single moves, pairs (2×2), 5 g / unit rounding, limits, exclusions, ranking, top 5.
7. ✅ **Adjuster UI**: dialog per cell, pick fixed macros, “what the day is missing” shortcut, exclude foods, apply an option.
8. ✅ **core/packages** + warnings UI. Pending: package-friendly amounts as a tie-breaker in the adjuster.
9. ✅ **Shopping list** dialog.
10. **Deploy** to Vercel + manual test on phone.

## Risks
- Adjuster with many foods: pairs are O(n²) ≈ 20k 2×2 systems for 200 foods (~250 ms). If it grows, restrict pairs to meal items × candidates.
- Supabase free tier pauses after a week of inactivity → scheduled GitHub Action calls `keep_alive()` daily.

## Verification
- `npm test` green (core logic).
- Manual: 7-day menu with a free Friday meal, apply an adjustment, package warning, shopping list, same data on phone.
