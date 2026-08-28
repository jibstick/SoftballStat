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

## Sharing it with someone else

`npm run build:portable` produces a single `dist-portable/index.html` file
with all JS/CSS inlined — no server and no other files needed. Send that one
file however you'd send any file (AirDrop, email, USB, a shared drive); the
recipient just double-clicks it to open it in their browser. Each person's
copy keeps its own local data, since `localStorage` is per-browser.
