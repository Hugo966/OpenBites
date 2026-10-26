# OpenBites — Status

**Last updated:** 26/10/2026 — v1 live at https://open-bites.vercel.app and repo public; all 10 plan tasks done, nothing half-finished.

Project background: [CONTEXTO.md](CONTEXTO.md). Spec and plan: [docs/SPEC.md](docs/SPEC.md), [docs/PLAN.md](docs/PLAN.md).

## Pending

### Product
- [ ] **Dishes** (reusable recipes) that can be dropped into a menu cell in one go.
- [ ] Adjuster: prefer package-friendly amounts as a tie-breaker (spec bonus).
- [ ] Legend / tooltip for the colored dots next to each food (blue = mostly protein, orange = carbs, pink = fat). Offered, not requested.
- [ ] Decide whether users should **share** foods or a household menu (today each login only sees their own data).
- [ ] Later: AI dish suggestions from target macros; fiber, sugar, salt.

### Operations
- [ ] Move the keep-alive to a **Vercel Cron Job**: public repos get scheduled Actions disabled after 60 days without commits (GitHub emails first, one click re-enables).

### Done
- [x] Spec, plan, calculation core, adjuster, packages, shopping list, login, foods, goals, menu grid.
- [x] GitHub repo, keep-alive, English code/docs, bilingual UI, Vercel deploy, repo public.

## Log

### 26/10/2026 — Shipped: keep-alive, GitHub, English codebase, bilingual UI, Vercel, public repo

**Done**

- Added a daily keep-alive (`supabase/keep-alive.sql` + `.github/workflows/keep-alive.yml`) so the free Supabase project never pauses after a week of inactivity. Verified a run end to end on GitHub.
- Created the GitHub repo `Hugo966/OpenBites`; rewrote the local history before the first push so every commit is Hugo's, in English, without any Claude attribution.
- Translated the whole codebase to English (identifiers, files, CSS classes, comments, tests); renamed the database table to `objects` and the function to `keep_alive()` (old data was disposable and was wiped with a migration Hugo ran).
- English README with screenshots, docs moved to `docs/`, MIT license, lint warnings to zero.
- Deployed to Vercel (auto-deploy on push) and configured Supabase auth redirects; Hugo confirmed login works from his phone.
- Made the UI bilingual (Spanish/English) with a toggle in the nav and on the login screen — Spanish-speaking users and English-speaking visitors each get their language.
- Fixed a mobile layout bug where English button labels overflowed the screen and cut off the bottom bar.
- Fixed the adjuster ranking: it could suggest "+875 g milk" because it preferred tiny accuracy gains; now, among options already within tolerance, the smallest edit to the meal wins. Covered by a new test (19 tests total).
- Regenerated screenshots with realistic sample data.
- Made the repo public, with the live URL as homepage and topics.

**Decisions**

- Keep-alive runs daily, not every 5 days: GitHub may delay or skip scheduled runs, and daily is still ~30 free minutes/month.
- Kept the keep-alive on GitHub for now instead of Vercel Cron; moving it is noted in Pending.
- i18n without a library: a typed dictionary is enough for two languages and makes missing translations a compile error.
- Default language follows the browser, so each audience sees its language without touching anything.

**Half-finished**

- Nothing.

### 21/10/2026 — Spec, plan and v1 build

**Done**

- Wrote the spec and plan after a round of questions (single user per login, per-100 g macros with optional units, dateless menu templates, free meals, day-type goals, deterministic adjuster, package rule, shopping list).
- Built the calculation core with tests: totals, units, free meals, tolerances; the adjuster (change/add/remove/swap, up to 2 moves); the package simulation and shopping list.
- Set up Supabase (single table with row-level security, magic-link login) and the screens: foods, goals, and the weekly menu grid with live totals, the adjuster per cell, package warnings and the shopping list.

**Decisions**

- After Hugo's feedback, the main screen is the menu as a spreadsheet-style grid; managing foods became secondary and foods can be created straight from a cell.
- One JSON table instead of a normalized schema; dishes will copy their items into the meal.
- Supabase over browser-only storage because the app must sync between computers and phones.

**Half-finished**

- Nothing.
