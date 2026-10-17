import { Game } from '../types'
import { QUICK_RANGES, QuickRange } from '../lib/useGameFilter'

/**
 * The quick-range buttons + "Choose Games…" checkbox picker, shared by Stats
 * and Trends. One filter row, above everything it scopes — never per-chart,
 * never per-table (see dataviz skill: filters & time ranges).
 */
export default function GameFilterControl({
  allGames,
  games,
  quickRange,
  setQuickRange,
  showGamePicker,
  setShowGamePicker,
  setCustomSelectedIds,
  toggleGame,
  scopeSummary,
}: {
  allGames: Game[]
  games: Game[]
  quickRange: QuickRange
  setQuickRange: (r: QuickRange) => void
  showGamePicker: boolean
  setShowGamePicker: (fn: (v: boolean) => boolean) => void
  setCustomSelectedIds: (s: Set<string>) => void
  toggleGame: (id: string) => void
  scopeSummary: string
}) {
  return (
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
          {allGames.length === 0 ? (
            <p className="text-sm text-slate-400">No games yet.</p>
          ) : (
            [...allGames]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input type="checkbox" checked={games.some((gg) => gg.id === g.id)} onChange={() => toggleGame(g.id)} />
                  <span className="truncate">
                    {g.date} vs {g.opponent}
                  </span>
                </label>
              ))
          )}
        </div>
      )}
    </div>
  )
}
