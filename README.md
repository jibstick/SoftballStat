# SoftballStat

A simple, local-only web app for manually tracking softball stats: build a
roster, run games live, and get season stats rolled up automatically.

- **Roster** — add players with jersey number and primary position.
- **Games** — create a game, set the batting order and starting defensive
  positions, then track it live.
  - **Batting tab**: tap a batter to log a plate appearance (1B/2B/3B/HR/BB/
    SO/K-L/HBP/SAC/SF/ROE/FC/Out) plus RBI, or log baserunning events
    (Run/SB/CS/Picked off).
  - **Fielding tab**: tap a position on the field diagram to assign/reassign
    a fielder, log putouts/assists/errors, or — for the pitcher — log
    pitching counters (BF, outs, H, BB, SO, HR, R, ER, HBP) and mark the
    winning/losing pitcher.
- **Stats** — season totals (or filtered to a single game) for batting,
  pitching, and fielding, each exportable to CSV. Fielding stats are broken
  out per position actually played (not the roster's primary-position
  label) — a player who covers both SS and 2B in a game gets a separate
  line for each, tied to the plays made at that position.

All data is stored locally in your browser (`localStorage`) — nothing is
sent to a server. Use the CSV export buttons on the Stats page to back up
or share your data.

## Development

```sh
npm install
npm run dev              # start the dev server
npm run build            # type-check and build dist/ for hosting
npm run preview          # preview the production build
npm run build:portable   # build one self-contained dist-portable/index.html
```

## Hosting for real, daily use

For actually using this day to day (not just previewing it), host it as a
real top-level website rather than an embedded preview — that's what makes
`localStorage` behave the way browsers expect, especially for "Add to Home
Screen" on iOS. A page loaded inside someone else's iframe wrapper is
subject to much stricter storage rules under Safari's tracking prevention,
which can mean data not reliably surviving even a simple relaunch.

This is a plain static site (`base: './'` in `vite.config.ts`, and
`HashRouter` for routing) — no server required.

**Using only your existing GitHub account, no new signups:** `.github/
workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on
every push. Two one-time steps, both in the repo's own settings (neither
can be done from a workflow file):
1. **Make the repo public** — Pages needs a paid GitHub plan for a private
   repo. This app has no secrets or backend credentials in it (it's 100%
   client-side), so nothing sensitive is newly exposed by this.
2. **Settings → Pages → Build and deployment → Source → "GitHub Actions."**

After that, pushes deploy automatically and the Actions tab shows the live
URL.

If keeping the repo private matters more than avoiding a new signup, a
host that supports private repos on its free tier — [Vercel]
(https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com) —
works the same way: sign in with GitHub, import the repo, accept the
auto-detected Vite build settings (`npm run build`, output `dist/`).

## Sharing it with someone else

`npm run build:portable` produces a single `dist-portable/index.html` file
with all JS/CSS inlined — no server and no other files needed. Send that one
file however you'd send any file (AirDrop, email, USB, a shared drive); the
recipient just double-clicks it to open it in their browser. Each person's
copy keeps its own local data, since `localStorage` is per-browser.
