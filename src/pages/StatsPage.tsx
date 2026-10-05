import { useMemo, useState } from 'react'
import { useData } from '../lib/store'
import { computeBattingStats, computeFieldingStatsByPosition, computePitchingStats, fmtAvg, fmtPct, fmtRate } from '../lib/stats'
import { downloadCsv, toCsv } from '../lib/csv'
import type { Game } from '../types'

/** Roughly Safari's own dormant-site eviction window — used as the "stale" threshold below too. */
const STALE_BACKUP_DAYS = 7

type QuickRange = 'all' | 'custom' | 1 | 2 | 7 | 30

const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'all', label: 'Season (All)' },
  { key: 1, label: 'Last 1 Day' },
  { key: 2, label: 'Last 2 Days' },
  { key: 7, label: 'Last 7 Days' },
  { key: 30, label: 'Last 30 Days' },
]

/** Calendar days between a game's date and today, both at local midnight — a game played earlier today is 0. */
function daysAgo(dateStr: string): number {
  const gameDate = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - gameDate.getTime()) / 86_400_000)
}

export default function StatsPage() {
  const { data, lastExportAt, recordExport } = useData()
  const [quickRange, setQuickRange] = useState<QuickRange>('all')
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set())
  const [showGamePicker, setShowGamePicker] = useState(false)

  const games = useMemo(() => {
    if (quickRange === 'all') return data.games
    if (quickRange === 'custom') return data.games.filter((g) => customSelectedIds.has(g.id))
    return data.games.filter((g) => daysAgo(g.date) < quickRange)
  }, [quickRange, customSelectedIds, data.games])

  // Toggling any individual game forks into a custom selection seeded from
  // whatever's currently showing (a quick range or an earlier custom pick),
  // so unchecking one game out of "Last 7 Days" behaves the way it looks —
  // everything else in that range stays selected.
  function toggleGame(id: string) {
    const current = new Set(games.map((g) => g.id))
    if (current.has(id)) current.delete(id)
    else current.add(id)
    setCustomSelectedIds(current)
    setQuickRange('custom')
  }

  const scopeLabel =
    quickRange === 'all'
      ? 'season'
      : quickRange === 'custom'
        ? games.length === 1
          ? games[0]?.date || 'game'
          : `${games.length}-games`
        : `last-${quickRange}-day${quickRange === 1 ? '' : 's'}`

  const scopeSummary =
    quickRange === 'all'
      ? `Season — ${games.length} game${games.length === 1 ? '' : 's'}`
      : quickRange === 'custom'
        ? `${games.length} selected game${games.length === 1 ? '' : 's'}`
        : `Last ${quickRange} day${quickRange === 1 ? '' : 's'} — ${games.length} game${games.length === 1 ? '' : 's'}`

  const battingRows = data.players.map((p) => ({ player: p, stats: computeBattingStats(data, p.id, games) }))
  const pitchingRows = data.players
    .map((p) => ({ player: p, stats: computePitchingStats(data, p.id, games) }))
    .filter((r) => r.stats.outs > 0 || r.stats.BF > 0)
  // One row per (player, position) — a player who covered multiple
  // positions gets a separate line for each, tied to the plays actually
  // made at that position, instead of one blended total.
  const fieldingRows = data.players.flatMap((player) =>
    computeFieldingStatsByPosition(data, player.id, games).map((stats) => ({ player, stats })),
  )

  // Headers/rows built once and shared between each section's own "Export
  // CSV" button and the combined "Export All" below. The row builders take
  // a games list so the same columns serve both the totals exports (all
  // selected games at once) and the by-game exports (one game at a time).
  const battingHeaders = [
    'Player', 'Number', 'GP', 'PA', 'AB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', '1B', '2B', '3B', 'HR', 'RBI', 'R',
    'BB', 'SO', 'K-L', 'HBP', 'GO', 'SAC', 'SF', 'ROE', 'FC', 'SB', 'SB%', 'CS', 'PIK', 'OA',
  ]
  const battingCsvRowsFor = (rows: typeof battingRows) =>
    rows.map(({ player, stats: s }) => [
      player.name, player.number, s.GP, s.PA, s.AB, fmtAvg(s.AVG), fmtAvg(s.OBP), fmtAvg(s.SLG), fmtAvg(s.OPS),
      s.H, s['1B'], s['2B'], s['3B'], s.HR, s.RBI, s.R, s.BB, s.SO, s['K-L'], s.HBP, s.GO, s.SAC, s.SF, s.ROE, s.FC,
      s.SB, fmtPct(s['SB%']), s.CS, s.PIK, s.OA,
    ])
  const battingCsvRows = battingCsvRowsFor(battingRows)

  const pitchingHeaders = ['Player', 'Number', 'G', 'IP', 'P', 'BF', 'H', 'R', 'ER', 'BB', 'SO', 'HR', 'W', 'L', 'ERA', 'WHIP']
  const pitchingCsvRowsFor = (rows: typeof pitchingRows) =>
    rows.map(({ player, stats: s }) => [
      player.name, player.number, s.G, s.IP, s.P, s.BF, s.H, s.R, s.ER, s.BB, s.SO, s.HR, s.W, s.L,
      fmtRate(s.ERA), fmtRate(s.WHIP),
    ])
  const pitchingCsvRows = pitchingCsvRowsFor(pitchingRows)

  const fieldingHeaders = ['Player', 'Number', 'Pos', 'G', 'PO', 'A', 'E', 'FPCT']
  const fieldingCsvRowsFor = (rows: typeof fieldingRows) =>
    rows.map(({ player, stats: s }) => [
      player.name, player.number, s.position, s.G, s.PO, s.A, s.E, fmtAvg(s.FPCT),
    ])
  const fieldingCsvRows = fieldingCsvRowsFor(fieldingRows)

  // By-game exports: one row per player per game, oldest game first, with
  // the game's date and opponent up front — a tidy layout that drops
  // straight into a spreadsheet chart or pivot table for trending a
  // player's numbers over time. Only players who actually played in (or
  // pitched in) a given game get a row for it.
  const gamesByDate = [...games].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
  const gameColumns = ['Date', 'Opponent', 'Home/Away']
  const gamePrefix = (g: Game) => [g.date, g.opponent, g.homeAway]

  const battingByGameHeaders = [...gameColumns, ...battingHeaders]
  const battingByGameRows = gamesByDate.flatMap((g) =>
    battingCsvRowsFor(
      data.players
        .map((p) => ({ player: p, stats: computeBattingStats(data, p.id, [g]) }))
        .filter((r) => r.stats.GP > 0),
    ).map((row) => [...gamePrefix(g), ...row]),
  )

  const pitchingByGameHeaders = [...gameColumns, ...pitchingHeaders]
  const pitchingByGameRows = gamesByDate.flatMap((g) =>
    pitchingCsvRowsFor(
      data.players
        .map((p) => ({ player: p, stats: computePitchingStats(data, p.id, [g]) }))
        .filter((r) => r.stats.outs > 0 || r.stats.BF > 0),
    ).map((row) => [...gamePrefix(g), ...row]),
  )

  const fieldingByGameHeaders = [...gameColumns, ...fieldingHeaders]
  const fieldingByGameRows = gamesByDate.flatMap((g) =>
    fieldingCsvRowsFor(
      data.players.flatMap((player) =>
        computeFieldingStatsByPosition(data, player.id, [g]).map((stats) => ({ player, stats })),
      ),
    ).map((row) => [...gamePrefix(g), ...row]),
  )

  function exportBatting() {
    downloadCsv(`softballstat-batting-${scopeLabel}.csv`, toCsv(battingHeaders, battingCsvRows))
    recordExport()
  }

  function exportPitching() {
    downloadCsv(`softballstat-pitching-${scopeLabel}.csv`, toCsv(pitchingHeaders, pitchingCsvRows))
    recordExport()
  }

  function exportFielding() {
    downloadCsv(`softballstat-fielding-${scopeLabel}.csv`, toCsv(fieldingHeaders, fieldingCsvRows))
    recordExport()
  }

  function exportBattingByGame() {
    downloadCsv(`softballstat-batting-by-game-${scopeLabel}.csv`, toCsv(battingByGameHeaders, battingByGameRows))
    recordExport()
  }

  function exportPitchingByGame() {
    downloadCsv(`softballstat-pitching-by-game-${scopeLabel}.csv`, toCsv(pitchingByGameHeaders, pitchingByGameRows))
    recordExport()
  }

  function exportFieldingByGame() {
    downloadCsv(`softballstat-fielding-by-game-${scopeLabel}.csv`, toCsv(fieldingByGameHeaders, fieldingByGameRows))
    recordExport()
  }

  type CsvSection = { title: string; headers: string[]; rows: (string | number)[][] }

  function downloadBundle(filename: string, candidates: CsvSection[]) {
    const sections = candidates.filter((s) => s.rows.length > 0)
    if (sections.length === 0) return
    const csv = sections.map((s) => `${s.title}\n${toCsv(s.headers, s.rows)}`).join('\n\n')
    downloadCsv(filename, csv)
    recordExport()
  }

  function exportAll() {
    // This used to fire three separate downloadCsv() calls. That's not
    // reliable in either form: firing them all in the same tick only ever
    // produced the last one (browsers coalesce/drop the earlier
    // synchronous anchor-click downloads), and spacing them out with
    // setTimeout only produced the first one instead — a download
    // triggered outside the original tap's call stack loses "user
    // activation" and gets silently blocked, especially on mobile Safari.
    // Bundling every section into one file sidesteps the whole problem:
    // it's a single download, triggered directly by the click, every time.
    downloadBundle(`softballstat-all-${scopeLabel}.csv`, [
      { title: 'Batting', headers: battingHeaders, rows: battingCsvRows },
      { title: 'Pitching', headers: pitchingHeaders, rows: pitchingCsvRows },
      { title: 'Fielding', headers: fieldingHeaders, rows: fieldingCsvRows },
    ])
  }

  function exportAllByGame() {
    downloadBundle(`softballstat-all-by-game-${scopeLabel}.csv`, [
      { title: 'Batting', headers: battingByGameHeaders, rows: battingByGameRows },
      { title: 'Pitching', headers: pitchingByGameHeaders, rows: pitchingByGameRows },
      { title: 'Fielding', headers: fieldingByGameHeaders, rows: fieldingByGameRows },
    ])
  }

  const daysSinceExport = lastExportAt === null ? null : Math.floor((Date.now() - lastExportAt) / 86_400_000)
  const backupIsStale = daysSinceExport === null || daysSinceExport >= STALE_BACKUP_DAYS
  const hasAnyData = battingRows.some((r) => r.stats.PA > 0) || data.games.length > 0

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stats</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pick a quick date range, or choose specific games — totals and exports below follow whatever's selected.
          </p>
        </div>
        <div className="space-y-2 min-w-0">
          <label className="label">Showing</label>
          <div className="flex gap-2 flex-wrap justify-end">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.key}
                className={`btn text-xs ${
                  quickRange === r.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'
                }`}
                onClick={() => setQuickRange(r.key)}
              >
                {r.label}
              </button>
            ))}
            <button
              className={`btn text-xs ${
                quickRange === 'custom' || showGamePicker
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-300'
              }`}
              onClick={() => setShowGamePicker((v) => !v)}
            >
              Choose Games…
            </button>
          </div>
          <p className="text-xs text-slate-400 text-right">{scopeSummary}</p>

          {showGamePicker && (
            <div className="card p-3 w-72 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-slate-100">
                <button className="text-emerald-600 hover:underline" onClick={() => setQuickRange('all')}>
                  Select All
                </button>
                <button
                  className="text-red-500 hover:underline"
                  onClick={() => {
                    setCustomSelectedIds(new Set())
                    setQuickRange('custom')
                  }}
                >
                  Clear
                </button>
              </div>
              {data.games.length === 0 ? (
                <p className="text-sm text-slate-400">No games yet.</p>
              ) : (
                [...data.games]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={games.some((gg) => gg.id === g.id)}
                        onChange={() => toggleGame(g.id)}
                      />
                      <span className="truncate">
                        {g.date} vs {g.opponent}
                      </span>
                    </label>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {hasAnyData && (
        <div
          className={`card p-3 flex items-center justify-between flex-wrap gap-3 text-sm ${
            backupIsStale ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <span>
            {daysSinceExport === null
              ? "You haven't exported a backup yet. This data only lives in this browser — export a CSV as a backup."
              : daysSinceExport === 0
                ? 'Backed up today.'
                : backupIsStale
                  ? `Last backup was ${daysSinceExport} days ago. Export a fresh CSV backup — dormant browser data can get cleared automatically.`
                  : `Last backup: ${daysSinceExport} day${daysSinceExport === 1 ? '' : 's'} ago.`}
          </span>
          <div className="flex gap-2 flex-wrap">
            <button className={backupIsStale ? 'btn-primary' : 'btn-secondary'} onClick={exportAll}>
              Export All CSV
            </button>
            <button className="btn-secondary" onClick={exportAllByGame} disabled={games.length === 0}>
              Export All by Game
            </button>
          </div>
        </div>
      )}

      <Section title="Batting" onExport={exportBatting} onExportByGame={exportBattingByGame} empty={battingRows.length === 0}>
        <table className="stat-table">
          <thead>
            <tr>
              {['Player', 'GP', 'PA', 'AB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', '1B', '2B', '3B', 'HR', 'RBI', 'R', 'BB', 'SO', 'K-L', 'HBP', 'GO', 'SAC', 'SF', 'ROE', 'FC', 'SB', 'SB%', 'CS', 'PIK', 'OA'].map(
                (h) => (
                  <th key={h} className={h === 'Player' ? 'text-left' : 'text-right'}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {battingRows.map(({ player, stats: s }) => (
              <tr key={player.id}>
                <td className="text-left font-medium">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </td>
                <td className="text-right">{s.GP}</td>
                <td className="text-right">{s.PA}</td>
                <td className="text-right">{s.AB}</td>
                <td className="text-right font-mono">{fmtAvg(s.AVG)}</td>
                <td className="text-right font-mono">{fmtAvg(s.OBP)}</td>
                <td className="text-right font-mono">{fmtAvg(s.SLG)}</td>
                <td className="text-right font-mono">{fmtAvg(s.OPS)}</td>
                <td className="text-right">{s.H}</td>
                <td className="text-right">{s['1B']}</td>
                <td className="text-right">{s['2B']}</td>
                <td className="text-right">{s['3B']}</td>
                <td className="text-right">{s.HR}</td>
                <td className="text-right">{s.RBI}</td>
                <td className="text-right">{s.R}</td>
                <td className="text-right">{s.BB}</td>
                <td className="text-right">{s.SO}</td>
                <td className="text-right">{s['K-L']}</td>
                <td className="text-right">{s.HBP}</td>
                <td className="text-right">{s.GO}</td>
                <td className="text-right">{s.SAC}</td>
                <td className="text-right">{s.SF}</td>
                <td className="text-right">{s.ROE}</td>
                <td className="text-right">{s.FC}</td>
                <td className="text-right">{s.SB}</td>
                <td className="text-right">{fmtPct(s['SB%'])}</td>
                <td className="text-right">{s.CS}</td>
                <td className="text-right">{s.PIK}</td>
                <td className="text-right">{s.OA}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Pitching" onExport={exportPitching} onExportByGame={exportPitchingByGame} empty={pitchingRows.length === 0}>
        <table className="stat-table">
          <thead>
            <tr>
              {['Player', 'G', 'IP', 'P', 'BF', 'H', 'R', 'ER', 'BB', 'SO', 'HR', 'W', 'L', 'ERA', 'WHIP'].map((h) => (
                <th key={h} className={h === 'Player' ? 'text-left' : 'text-right'}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pitchingRows.map(({ player, stats: s }) => (
              <tr key={player.id}>
                <td className="text-left font-medium">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </td>
                <td className="text-right">{s.G}</td>
                <td className="text-right font-mono">{s.IP}</td>
                <td className="text-right">{s.P}</td>
                <td className="text-right">{s.BF}</td>
                <td className="text-right">{s.H}</td>
                <td className="text-right">{s.R}</td>
                <td className="text-right">{s.ER}</td>
                <td className="text-right">{s.BB}</td>
                <td className="text-right">{s.SO}</td>
                <td className="text-right">{s.HR}</td>
                <td className="text-right">{s.W}</td>
                <td className="text-right">{s.L}</td>
                <td className="text-right font-mono">{fmtRate(s.ERA)}</td>
                <td className="text-right font-mono">{fmtRate(s.WHIP)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Fielding" onExport={exportFielding} onExportByGame={exportFieldingByGame} empty={fieldingRows.length === 0}>
        <p className="px-3 pt-2 text-xs text-slate-400">
          One line per position played — a player who covered more than one position across what's selected here
          gets a row for each.
        </p>
        <table className="stat-table">
          <thead>
            <tr>
              {['Player', 'Pos', 'G', 'PO', 'A', 'E', 'FPCT'].map((h) => (
                <th key={h} className={h === 'Player' ? 'text-left' : 'text-right'}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fieldingRows.map(({ player, stats: s }) => (
              <tr key={`${player.id}-${s.position}`}>
                <td className="text-left font-medium">
                  {player.number ? `#${player.number} ` : ''}
                  {player.name}
                </td>
                <td className="text-right font-mono">{s.position}</td>
                <td className="text-right">{s.G}</td>
                <td className="text-right">{s.PO}</td>
                <td className="text-right">{s.A}</td>
                <td className="text-right">{s.E}</td>
                <td className="text-right font-mono">{fmtAvg(s.FPCT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

function Section({
  title,
  onExport,
  onExportByGame,
  empty,
  children,
}: {
  title: string
  onExport: () => void
  onExportByGame: () => void
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={onExport} disabled={empty}>
            Export CSV
          </button>
          <button className="btn-secondary text-xs" onClick={onExportByGame} disabled={empty}>
            By Game CSV
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        {empty ? (
          <p className="p-6 text-center text-slate-400 text-sm">No {title.toLowerCase()} data yet.</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
