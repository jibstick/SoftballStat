import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/store'
import { LineupSlot, POSITIONS, Position } from '../types'
import { clearGameDraft, loadGameDraft, saveGameDraft } from '../lib/gameDraft'

interface Row {
  key: string
  playerId: string
  startPosition: Position | 'BENCH'
}

let rowKeySeq = 0
function newRow(): Row {
  return { key: `row-${rowKeySeq++}`, playerId: '', startPosition: 'BENCH' }
}

const DEFAULT_ROW_COUNT = 9

export default function GameSetupPage() {
  const { data, addGame, updateGame } = useData()
  const navigate = useNavigate()

  // Restore an in-progress draft on first render, if there is one — this is
  // what makes leaving mid-fill-out (or the tab closing) non-destructive.
  const [initialDraft] = useState(() => loadGameDraft())
  const [draftRestored, setDraftRestored] = useState(() => {
    if (!initialDraft) return false
    // Don't bother announcing "restored" for a draft that was never
    // actually touched — every field still at its default.
    const untouched =
      !initialDraft.opponent.trim() &&
      initialDraft.homeAway === 'home' &&
      initialDraft.innings === 7 &&
      initialDraft.rows.every((r) => !r.playerId)
    return !untouched
  })

  const [opponent, setOpponent] = useState(() => initialDraft?.opponent ?? '')
  const [date, setDate] = useState(() => initialDraft?.date || new Date().toISOString().slice(0, 10))
  const [homeAway, setHomeAway] = useState<'home' | 'away'>(() => initialDraft?.homeAway ?? 'home')
  const [innings, setInnings] = useState(() => initialDraft?.innings ?? 7)
  const [rows, setRows] = useState<Row[]>(() => {
    if (initialDraft && initialDraft.rows.length > 0) {
      // A player from the draft may since have been removed from the
      // roster — drop that selection rather than restore a dangling id.
      const knownPlayerIds = new Set(data.players.map((p) => p.id))
      return initialDraft.rows.map((r) => ({
        ...newRow(),
        playerId: knownPlayerIds.has(r.playerId) ? r.playerId : '',
        startPosition: r.startPosition,
      }))
    }
    return Array.from({ length: DEFAULT_ROW_COUNT }, () => newRow())
  })
  const [error, setError] = useState<string | null>(null)

  // Autosave the draft on every change. A form that's still exactly at its
  // defaults isn't worth persisting — clear any stale draft instead, so a
  // visit-and-immediately-leave doesn't leave behind a confusing restore
  // (and a saved default date doesn't go stale if they come back days later).
  useEffect(() => {
    const isBlank = !opponent.trim() && homeAway === 'home' && innings === 7 && rows.every((r) => !r.playerId)
    if (isBlank) {
      clearGameDraft()
      return
    }
    saveGameDraft({
      opponent,
      date,
      homeAway,
      innings,
      rows: rows.map((r) => ({ playerId: r.playerId, startPosition: r.startPosition })),
    })
  }, [opponent, date, homeAway, innings, rows])

  function discardDraft() {
    clearGameDraft()
    setOpponent('')
    setDate(new Date().toISOString().slice(0, 10))
    setHomeAway('home')
    setInnings(7)
    setRows(Array.from({ length: DEFAULT_ROW_COUNT }, () => newRow()))
    setDraftRestored(false)
    setError(null)
  }

  const usedPlayerIds = new Set(rows.map((r) => r.playerId).filter(Boolean))
  const positionCounts: Partial<Record<Position, number>> = {}
  for (const r of rows) {
    if (r.startPosition !== 'BENCH') {
      positionCounts[r.startPosition] = (positionCounts[r.startPosition] || 0) + 1
    }
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!opponent.trim()) {
      setError('Enter an opponent name before starting the game.')
      return
    }
    const lineup: LineupSlot[] = rows
      .filter((r) => r.playerId)
      .map((r, i) => ({ playerId: r.playerId, battingOrder: i + 1, startPosition: r.startPosition }))
    if (lineup.length === 0) {
      setError('Add at least one player to the lineup before starting the game.')
      return
    }
    const id = addGame({ opponent: opponent.trim(), date, homeAway, inningsScheduled: innings, lineup })
    updateGame(id, { status: 'in_progress' })
    clearGameDraft()
    navigate(`/games/${id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">New Game</h1>
        <p className="text-slate-500 text-sm mt-1">Set the matchup and starting lineup.</p>
      </div>

      {draftRestored && (
        <div className="card p-3 flex items-center justify-between gap-3 bg-slate-50 border-slate-200 text-sm text-slate-600">
          <span>Picked up where you left off — this is saved automatically as you go.</span>
          <button type="button" className="btn-secondary text-xs shrink-0" onClick={discardDraft}>
            Start Fresh
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="opponent">
              Opponent
            </label>
            <input
              id="opponent"
              className="input"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Riverside Rockets"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="homeaway">
              Home / Away
            </label>
            <select
              id="homeaway"
              className="input"
              value={homeAway}
              onChange={(e) => setHomeAway(e.target.value as 'home' | 'away')}
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="innings">
              Innings Scheduled
            </label>
            <input
              id="innings"
              type="number"
              min={1}
              max={15}
              className="input"
              value={innings}
              onChange={(e) => setInnings(Number(e.target.value) || 7)}
            />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">Starting Lineup</h2>
            <button type="button" className="btn-secondary" onClick={() => setRows((rs) => [...rs, newRow()])}>
              + Add Batter
            </button>
          </div>

          {data.players.length === 0 ? (
            <p className="text-sm text-slate-400">No players on the roster yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => {
                const duplicatePosition = r.startPosition !== 'BENCH' && (positionCounts[r.startPosition] || 0) > 1
                return (
                  <div key={r.key} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="w-5 shrink-0 text-right text-sm text-slate-400 font-mono">{i + 1}</span>
                    <select
                      className="input flex-1 min-w-0 basis-full sm:basis-auto"
                      value={r.playerId}
                      onChange={(e) => updateRow(r.key, { playerId: e.target.value })}
                    >
                      <option value="">— Select player —</option>
                      {data.players.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={usedPlayerIds.has(p.id) && p.id !== r.playerId}
                        >
                          {p.number ? `#${p.number} ` : ''}
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={`input flex-1 sm:flex-none sm:w-28 min-w-0 ${duplicatePosition ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                      value={r.startPosition}
                      onChange={(e) => updateRow(r.key, { startPosition: e.target.value as Position | 'BENCH' })}
                      title={duplicatePosition ? 'Position already assigned to another batter' : undefined}
                    >
                      <option value="BENCH">Bench</option>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="shrink-0 text-slate-400 hover:text-red-600 px-2 py-2"
                      onClick={() => removeRow(r.key)}
                      aria-label="Remove batter"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary">
            Start Game
          </button>
        </div>
      </form>
    </div>
  )
}
