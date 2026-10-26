# OpenBites — Specification v1

## Context
A personal app (single user, used by family members) to build custom meal plans (templates of N days) from foods you enter yourself, compute macros automatically, and use a **deterministic adjuster** that tells you what to change in a meal to reach a macro target. Generative AI for suggesting dishes is out of scope for v1.

## Stack
- React + TypeScript + Vite. Responsive web (phone and desktop). UI in Spanish.
- Supabase: Postgres + magic-link auth (RLS by `user_id`). Data synced across devices.
- Free hosting on Vercel/Netlify.
- Calculation logic (macros, adjuster, packages, shopping list) in pure, dependency-free TypeScript, tested with Vitest.

## Data model
- **Food**: name, kcal/protein/carbs/fat **per 100 g**; optional `gramsPerUnit` (grams per unit, so amounts can be “2 eggs”); optional `package` (`grams`, `daysOpen`); `neverSuggest` flag; optional min/max grams.
- **Dish** (recipe): name + list of (food, amount). Added to a meal in one go; its items are copied so they can be edited in place.
- **Day type**: name (training, rest…) + daily kcal/P/C/F goal.
- **Menu** (dateless template): name, meal rows (`mealNames`), ordered list of days.
- **Day**: free name (“Monday”, “Day 3”), day type, one cell per meal row.
- **Meal**: `free` flag, list of items (food + amount in g or units).

## v1 features
1. **CRUD for foods and dishes.**
2. **Menu editor** (the main screen, spreadsheet-like): create/duplicate menus, days and meals; add foods/dishes with amounts.
3. **Live totals**: per meal, per day (vs. the day type's goal: surplus/deficit) and per menu. A day is “on target” when within **±20 kcal and ±5 g per macro**.
4. **Free meals**: excluded from totals and daily goal comparison.
5. **Adjuster** (per meal):
   - Input: target deltas for one or more macros (`+20 g protein`, `±0 kcal`); unset macros are free but their change is shown. Per-macro tolerance.
   - Moves: change an existing amount, add a food, remove an item, swap an item; combinations of **up to 2 moves**.
   - Candidates: all foods except `neverSuggest` ones and those excluded in the current request.
   - Amounts: multiples of 5 g; unit-based foods in whole units; respect each food's min/max.
   - Algorithm: weighted least squares (1-D / 2×2) per food or pair, rounded to valid steps, filtered by limits. Ranking: within tolerance → fewer changes → fewer grams moved; outside tolerance → lowest weighted error. Returns the top 5.
   - Default tolerance (editable per request): **±5 kcal, ±2 g per macro**.
   - Bonus: prefer amounts that fit package sizes (see 6).
6. **Package rule** (warning + suggestion): for foods with a package, count menu uses within `daysOpen` and warn when `size / uses` doesn't fit (leftovers get thrown away). Suggest amounts that fit (size ÷ uses) or adding/removing a use. Example: 200 g guacamole, 7 days open, used once a week → 200 g per use; twice → 100 g.
7. **Shopping list**: total per food across the menu (g or units) → number of packages when a size is set, and leftovers.

## Out of scope for v1
- AI to generate dishes from target macros.
- Fiber, sugars, salt.
- Calendar with real dates, logging what was actually eaten.
- CSV / Open Food Facts import.
- Weekly compensation logic for free meals.

## Verification
- Vitest on the calculation core: totals, unit conversion, adjuster (known exact solutions), package rule, shopping list.
- Manual browser testing (phone and desktop) against Supabase: create foods, a 7-day menu with a free Friday meal, run and apply an adjustment, check the shopping list.
