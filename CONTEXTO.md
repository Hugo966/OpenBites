# OpenBites — Project context

Stable background for anyone (human or AI) picking this project up. Day-to-day progress lives in [ESTADO.md](ESTADO.md).

## What it is
A personal weekly meal planner. You build a menu (any number of days × configurable meals) from your own foods with macros per 100 g; the app totals kcal/protein/carbs/fat, compares each day with its goal, suggests exact tweaks to hit a macro target (deterministic adjuster), warns when a package portion causes waste, and builds a shopping list.

## Who uses it
- Spanish-speaking users → the UI is bilingual (Spanish default for Spanish browsers, English otherwise, toggle in the nav).
- The repo is **public as a portfolio piece** for recruiters → README, docs, code, comments and commit messages are in **English**.

## Infrastructure
| Piece | Where | Notes |
|---|---|---|
| Code | GitHub `Hugo966/OpenBites` (public, branch `main`) | MIT license |
| Hosting | Vercel, Hobby (free), project `open-bites` on Hugo's account (same account as his other site) | Auto-deploys every push to `main` → https://open-bites.vercel.app |
| Database + auth | Supabase, free plan, project "OpenBites" (org hugogalvezs) | Magic-link email login. Table `objects` with RLS; function `keep_alive()` |
| Keep-alive | GitHub Action `.github/workflows/keep-alive.yml`, daily 08:00 UTC | Free tier pauses after 7 idle days |

### Where the credentials live (never write their values here)
- Supabase URL + publishable key: local `.env.local` (git-ignored), Vercel env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`, GitHub repo secrets `SUPABASE_URL` / `SUPABASE_KEY`.
- Supabase Auth URL config: Site URL = the Vercel URL; Redirect URLs = Vercel URL + `http://localhost:5173`.

## Architecture decisions
- **React + TypeScript + Vite, no UI or i18n libraries**: hand-written CSS with tokens; translations in a typed dictionary (`src/i18n.ts`) so a missing translation fails compilation.
- **All domain logic in `src/core`** as pure TS with Vitest tests (macros, adjuster, packages/shopping). UI and Supabase stay out of it.
- **One table** `objects (kind, data jsonb)` instead of a normalized schema: menus are always read/edited whole. Adding a dish to a meal will copy its items.
- **Menu = spreadsheet grid** (days as columns, meals as rows). This is the main screen; managing foods is secondary. Hugo rejected a foods-first UI.
- **Adjuster** is deterministic (least squares over 1–2 moves, rounded to 5 g / whole units). Among options within tolerance the **smallest edit** wins; outside tolerance the closest wins.
- **Package rule** simulates repeated menu cycles (open on first use, discard after `daysOpen`).
- Tolerances: per meal / adjuster ±5 kcal, ±2 g per macro; per day ±20 kcal, ±5 g.

## How Hugo works
- Flow: spec → plan → build → test → review → ship. Asks for questions before big decisions.
- Commits as `Hugo Gálvez Ureña <hugogalvezu96@gmail.com>`. **Never** add `Co-Authored-By: Claude` or "Generated with Claude Code".
- Cares a lot about how things look; check UI with screenshots (light/dark, phone/desktop) before calling it done.

## Running it
```bash
npm install && npm run dev      # http://localhost:5173
npm test && npm run lint && npm run build
```
Fresh Supabase project: run `supabase/schema.sql` and `supabase/keep-alive.sql` in the SQL editor.
