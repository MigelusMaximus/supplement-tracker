# Supplement Tracker

A private, offline-first app for the supplements you take every day.

- **Today**: a checklist grouped by morning, midday, evening and bedtime, with the current time of day highlighted. Tap to take, tap again to undo, or skip on purpose. Shows a progress ring, your streak, low-stock and backup reminders, and a 10-second check-in (energy, mood, sleep).
- **Is it working?**: compares your check-ins with vs without each supplement (before vs since starting, or days taken vs missed). A result only counts when the difference is both meaningful and unlikely to be chance.
- **Supplement page**: its own history calendar, adherence, stock, cost and effect summary.
- **Restock planner**: what to buy for the next 30/60/90 days, with cost, shop links and one-tap "Bought".
- **Stack**: your supplements, grouped by priority tier: **Essential**, **Important**, **Beneficial**, **Experimental**. Each one shows its schedule, cost per month, and how long your supply will last.
- **Insights**: a daily-completion calendar, adherence per supplement, monthly cost by tier, and when each one runs out.
- **Settings**: currency, theme, low-stock threshold, JSON backup and restore.
- **Guide**: an illustrated how-to built into the app, covering every screen, phone installation and common questions.

Schedules can be daily, specific weekdays, every N days, or as needed. Inventory goes down automatically when you mark a dose as taken and comes back if you undo. Add a container's price and size and the app works out cost per unit and per month.

There's no account and no server. Data lives in your browser's IndexedDB on your device. It installs as an app on phone or desktop (PWA) and works fully offline. Download a backup from Settings now and then.

> This is a logbook, not medical advice.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # domain + database tests
npm run build      # static site in dist/
npm run preview    # serve the production build
```

The build is a plain static folder with relative paths, so it can be hosted anywhere. `.github/workflows/deploy.yml` tests it and publishes it to GitHub Pages on every push to `main`. To turn that on, open the repo's **Settings → Pages → Source** and pick **GitHub Actions**.

## How it's built

React 19, TypeScript, Vite, Dexie (IndexedDB), vite-plugin-pwa. There's no UI framework or charting library; the charts are hand-made SVG and CSS.

```
src/
  domain/          pure logic, no I/O, fully unit-tested
    types.ts       data model
    dates.ts       timezone-safe YYYY-MM-DD arithmetic
    schedule.ts    what is due on a given day
    inventory.ts   daily use, cost per month, run-out forecast
    adherence.ts   daily completion, streaks, per-supplement rates
    effects.ts     with-vs-without comparison of check-ins (mean difference + standard error)
  db.ts            Dexie schema and every write operation (transactional)
  seed.ts          example stack with two months of history
  ui/              shared components, icons, hooks
  views/           Today, Stack, Detail, Editor, RestockPlanner, Insights, Settings, Guide
```

Design decisions:

- **Days are `YYYY-MM-DD` strings, not timestamps.** "Did I take it on Tuesday" never shifts with timezones or daylight saving.
- **One intake record per scheduled dose** (`date|supplement|slot`). Marking a dose is idempotent, and inventory changes in the same transaction as the log.
- **Archiving keeps history.** An archived supplement stops counting from the next day, so past adherence stays accurate. Deleting removes its history too.
- **As-needed supplements never count against adherence.** Their run-out forecast uses the last 30 days of actual use.
- **Sleep is matched to the night before.** The morning sleep rating is compared against the previous day's dose, because that's when a bedtime supplement acts.
